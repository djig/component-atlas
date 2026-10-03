import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { parse as parseDocgen, ParserOptions } from 'react-docgen-typescript';
import type { ComponentInfo, ComponentProp, ComponentVariant, ScanOptions } from './types.js';

export class ComponentScanner {
  private options: Required<ScanOptions>;

  constructor(options: ScanOptions) {
    this.options = {
      rootDir: options.rootDir,
      include: options.include || ['**/*.tsx', '**/*.ts'],
      exclude: options.exclude || ['**/node_modules/**', '**/dist/**', '**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts'],
      maxExamples: options.maxExamples ?? 3,
      skipVariants: options.skipVariants ?? false,
      includeInheritedProps: options.includeInheritedProps ?? false,
    };
  }

  async scan(): Promise<ComponentInfo[]> {
    const componentFiles = this.findComponentFiles();
    const components: ComponentInfo[] = [];

    for (const file of componentFiles) {
      try {
        const fileComponents = await this.scanFile(file);
        components.push(...fileComponents);
      } catch (error) {
        console.warn(`Failed to scan ${file}:`, error);
      }
    }

    if (!this.options.skipVariants) {
      await this.enrichWithUsageExamples(components);
    }

    return components;
  }

  private findComponentFiles(): string[] {
    const files: string[] = [];
    
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.options.rootDir, fullPath);
        
        if (this.shouldExclude(relativePath)) continue;
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && this.shouldInclude(entry.name)) {
          files.push(fullPath);
        }
      }
    };
    
    walk(this.options.rootDir);
    return files;
  }

  private shouldInclude(filename: string): boolean {
    return /\.(tsx|ts)$/.test(filename);
  }

  private shouldExclude(relativePath: string): boolean {
    return this.options.exclude.some(pattern => {
      const regex = this.globToRegex(pattern);
      return regex.test(relativePath);
    });
  }

  private globToRegex(glob: string): RegExp {
    const pattern = glob
      .replace(/\*\*/g, '§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${pattern}$`);
  }

  private async scanFile(filePath: string): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];
    const source = fs.readFileSync(filePath, 'utf-8');
    
    const hasReactImport = /import\s+.*\s+from\s+['"]react['"]/.test(source) || 
                          /import\s+React/.test(source);
    if (!hasReactImport) return components;

    try {
      const parserOptions: ParserOptions = {
        savePropValueAsString: true,
        shouldExtractLiteralValuesFromEnum: true,
        shouldRemoveUndefinedFromOptional: true,
      };

      const docs = parseDocgen(filePath, parserOptions);
      
      for (const doc of docs) {
        let allProps = this.extractProps(doc);
        const extendsTypes = this.detectExtendsTypes(source, doc.displayName);
        
        // Always try manual extraction to supplement docgen (e.g., for missing 'children')
        const manualProps = this.extractPropsManually(filePath, source, doc.displayName);
        
        // Track which props came from manual extraction (component-specific)
        const manualPropNames = new Set(manualProps.map(p => p.name));
        
        // Merge props, preferring docgen but adding manual props that are missing
        const propNames = new Set(allProps.map(p => p.name));
        for (const manualProp of manualProps) {
          if (!propNames.has(manualProp.name)) {
            allProps.push(manualProp);
          }
        }
        
        const { props, filteredCount } = this.filterInheritedProps(allProps, extendsTypes, manualPropNames);
        const variants = this.extractVariants(source, doc.displayName);
        const { isServerComponent, isClientComponent } = this.detectComponentType(source);
        const isForwardRef = this.detectForwardRef(source, doc.displayName);
        
        if (filteredCount > 0) {
          console.warn(`Filtered ${filteredCount} inherited props from ${doc.displayName}`);
        }
        
        components.push({
          name: doc.displayName,
          filePath: path.relative(this.options.rootDir, filePath),
          exportType: this.detectExportType(source, doc.displayName),
          props,
          variants,
          description: doc.description || undefined,
          deprecated: this.detectDeprecated(doc.description),
          usageExamples: [],
          isServerComponent,
          isClientComponent,
          isForwardRef,
          extends: extendsTypes.length > 0 ? extendsTypes : undefined,
        });
      }
    } catch {
      console.warn(`react-docgen-typescript failed for ${filePath}, falling back to manual parse`);
      const manualComponents = this.manualParse(filePath, source);
      components.push(...manualComponents);
    }

    return components;
  }

  private extractProps(doc: any): ComponentProp[] {
    const props: ComponentProp[] = [];
    
    for (const [propName, propInfo] of Object.entries(doc.props || {})) {
      const prop = propInfo as any;
      props.push({
        name: propName,
        type: prop.type?.name || 'unknown',
        required: prop.required || false,
        defaultValue: prop.defaultValue?.value,
        description: prop.description || undefined,
      });
    }
    
    return props;
  }

  private extractPropsManually(filePath: string, source: string, componentName: string): ComponentProp[] {
    const props: ComponentProp[] = [];
    
    try {
      // Create TypeScript source file and program for type checking
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true
      );

      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        skipLibCheck: true,
      };

      const host = ts.createCompilerHost(compilerOptions);
      const originalGetSourceFile = host.getSourceFile;
      host.getSourceFile = (fileName, languageVersion) => {
        if (fileName === filePath) {
          return sourceFile;
        }
        return originalGetSourceFile(fileName, languageVersion);
      };

      const program = ts.createProgram([filePath], compilerOptions, host);
      program.getTypeChecker(); // Initialize type checker

      // Find the props interface/type
      const propsInterfaceName = `${componentName}Props`;
      let propsNode: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | undefined;

      const visit = (node: ts.Node) => {
        if (ts.isInterfaceDeclaration(node) && node.name.text === propsInterfaceName) {
          propsNode = node;
        } else if (ts.isTypeAliasDeclaration(node) && node.name.text === propsInterfaceName) {
          propsNode = node;
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      if (propsNode) {
        // Extract only own properties declared in this interface/type
        if (ts.isInterfaceDeclaration(propsNode)) {
          // For interfaces, only extract members directly on the interface body
          // (not from extends clauses)
          for (const member of propsNode.members) {
            if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
              const propName = member.name.text;
              const isOptional = !!member.questionToken;
              const typeNode = member.type;
              const propType = typeNode ? this.getTypeString(typeNode, sourceFile) : 'unknown';

              props.push({
                name: propName,
                type: propType,
                required: !isOptional,
                description: this.extractJsDocComment(member),
              });
            }
          }
        } else if (ts.isTypeAliasDeclaration(propsNode)) {
          // Handle type alias - only extract from inline type literals
          const typeNode = propsNode.type;
          this.extractOwnPropsFromTypeNode(typeNode, sourceFile, props);
        }
      }
    } catch (error) {
      console.warn(`Manual prop extraction failed for ${componentName}:`, error);
    }

    return props;
  }

  private extractOwnPropsFromTypeNode(typeNode: ts.TypeNode, sourceFile: ts.SourceFile, props: ComponentProp[]): void {
    if (ts.isTypeLiteralNode(typeNode)) {
      // Extract props from inline type literal
      for (const member of typeNode.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          const propName = member.name.text;
          const isOptional = !!member.questionToken;
          const propTypeNode = member.type;
          const propType = propTypeNode ? this.getTypeString(propTypeNode, sourceFile) : 'unknown';

          props.push({
            name: propName,
            type: propType,
            required: !isOptional,
            description: this.extractJsDocComment(member),
          });
        }
      }
    } else if (ts.isIntersectionTypeNode(typeNode)) {
      // For intersections, only extract from inline type literals (own props)
      // Skip type references like React.ButtonHTMLAttributes or VariantProps
      for (const type of typeNode.types) {
        if (ts.isTypeLiteralNode(type)) {
          this.extractOwnPropsFromTypeNode(type, sourceFile, props);
        }
      }
    }
    // Ignore type references, unions, etc. - those are "extends" not own props
  }

  private getTypeString(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string {
    // Get the text of the type as it appears in source
    const text = typeNode.getText(sourceFile);
    
    // Simplify common patterns
    if (text.length > 100) {
      return text.substring(0, 97) + '...';
    }
    
    return text;
  }

  private extractJsDocComment(node: ts.Node): string | undefined {
    const jsDoc = (node as any).jsDoc;
    if (jsDoc && jsDoc.length > 0) {
      const comment = jsDoc[0].comment;
      if (typeof comment === 'string') {
        return comment;
      }
    }
    return undefined;
  }

  private detectExtendsTypes(source: string, componentName: string): string[] {
    const extendsTypes: string[] = [];
    
    const patterns = [
      new RegExp(`interface\\s+${componentName}Props\\s+extends\\s+([^{]+)\\s*\\{`, 's'),
      new RegExp(`type\\s+${componentName}Props\\s*=\\s*[^&]*&\\s*([^{;]+)`, 's'),
      new RegExp(`${componentName}\\s*=\\s*.*?forwardRef<[^,]+,\\s*([^>]+)>`, 's'),
      new RegExp(`const\\s+${componentName}[^=]*=[^<]*<[^,]+,\\s*([^>]+)>`, 's'),
    ];
    
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) {
        const extendsStr = match[1];
        const types = extendsStr.split(/[,&]/).map(t => t.trim()).filter(t => t.length > 0 && !t.startsWith('('));
        extendsTypes.push(...types);
      }
    }
    
    return [...new Set(extendsTypes)];
  }

  private filterInheritedProps(
    props: ComponentProp[],
    extendsTypes: string[],
    manualPropNames?: Set<string>
  ): { props: ComponentProp[]; filteredCount: number } {
    if (this.options.includeInheritedProps || extendsTypes.length === 0) {
      return { props, filteredCount: 0 };
    }

    // Props that are commonly useful even when inherited, so we keep them
    // Also includes props that often have the same name as HTML attributes
    // but are component-specific (like 'label' for form components)
    const keepCommonProps = new Set([
      'className', 'style', 'id', 'children',
      'label', // Common for form components
      'error', // Common for form validation
    ]);

    const domAttributePatterns = [
      /^on[A-Z]/, // Event handlers (onClick, onChange, etc.)
      /^aria-?/, // ARIA attributes
      /^data-?/, // Data attributes
    ];

    // Comprehensive list of standard HTML attributes to filter out
    const htmlAttributes = new Set([
      'accept', 'acceptCharset', 'accessKey', 'action', 'allowFullScreen',
      'allowTransparency', 'alt', 'as', 'async', 'autoComplete', 'autoFocus',
      'autoPlay', 'capture', 'cellPadding', 'cellSpacing', 'challenge', 'charSet',
      'checked', 'cite', 'classID', 'cols', 'colSpan', 'content', 'contentEditable',
      'contextMenu', 'controls', 'coords', 'crossOrigin', 'dateTime', 'default',
      'defer', 'dir', 'disabled', 'download', 'draggable', 'encType', 'form', 'formAction',
      'formEncType', 'formMethod', 'formNoValidate', 'formTarget', 'frameBorder',
      'headers', 'height', 'hidden', 'high', 'href', 'hrefLang', 'htmlFor',
      'httpEquiv', 'icon', 'inputMode', 'integrity', 'is', 'keyParams', 'keyType',
      'kind', 'label', 'lang', 'list', 'loop', 'low', 'manifest', 'marginHeight',
      'marginWidth', 'max', 'maxLength', 'media', 'mediaGroup', 'method', 'min',
      'minLength', 'multiple', 'muted', 'name', 'nonce', 'noValidate', 'open', 'optimum',
      'pattern', 'ping', 'placeholder', 'poster', 'preload', 'radioGroup', 'readOnly', 'rel',
      'required', 'reversed', 'role', 'rows', 'rowSpan', 'sandbox', 'scope',
      'scoped', 'scrolling', 'seamless', 'selected', 'shape', 'sizes',
      'slot', 'span', 'spellCheck', 'src', 'srcDoc', 'srcLang', 'srcSet', 'start',
      'step', 'summary', 'tabIndex', 'target', 'title', 'translate', 'useMap',
      'width', 'wmode', 'wrap',
      'defaultChecked', 'defaultValue', 'suppressContentEditableWarning',
      'suppressHydrationWarning', 'autoCapitalize', 'enterKeyHint',
      // React-specific
      'ref', 'key',
      // Additional HTML/DOM attributes
      'about', 'autoCapitalize', 'autoCorrect', 'autoSave', 'capture', 'color', 
      'contentEditable', 'dangerouslySetInnerHTML', 'enterKeyHint', 'exportparts', 
      'inert', 'inputMode', 'inlist', 'itemID', 'itemProp', 'itemRef',
      'itemScope', 'itemType', 'part', 'popover', 'popoverTarget', 
      'popoverTargetAction', 'prefix', 'property', 'resource', 'results',
      'rev', 'security', 'translate', 'type', 'typeof', 'unselectable', 
      'value', 'vocab',
    ]);

    const hasHTMLExtends = extendsTypes.some(t =>
      t.includes('HTMLAttributes') ||
      t.includes('HTMLProps') ||
      t.includes('ButtonHTMLAttributes') ||
      t.includes('InputHTMLAttributes') ||
      t.includes('DivHTMLAttributes') ||
      t.includes('FormHTMLAttributes') ||
      t.includes('AnchorHTMLAttributes') ||
      t.includes('TextareaHTMLAttributes') ||
      t.includes('SelectHTMLAttributes')
    );

    if (!hasHTMLExtends) {
      return { props, filteredCount: 0 };
    }

    const filtered = props.filter(prop => {
      // If prop was manually extracted (declared in component's own interface), always keep it
      if (manualPropNames && manualPropNames.has(prop.name)) return true;
      
      // Keep common useful props
      if (keepCommonProps.has(prop.name)) return true;
      
      // Filter out event handlers and aria/data attributes (always remove)
      if (domAttributePatterns.some(pattern => pattern.test(prop.name))) return false;
      
      // Special case: 'size' - keep if enum (component-specific), filter if number (HTML attribute)
      if (prop.name === 'size') {
        return prop.type === 'enum' || prop.type.includes('|');
      }
      
      // Filter out known HTML/DOM attributes
      if (htmlAttributes.has(prop.name)) return false;
      
      // Keep everything else (component-specific props)
      return true;
    });

    return {
      props: filtered,
      filteredCount: props.length - filtered.length,
    };
  }

  private extractVariants(source: string, _componentName: string): ComponentVariant[] {
    const variants: ComponentVariant[] = [];
    
    const cvaStart = source.indexOf('cva(');
    if (cvaStart !== -1) {
      const afterCva = source.substring(cvaStart);
      const variantsMatch = afterCva.match(/variants\s*:\s*\{/);
      if (variantsMatch) {
        const variantsStart = cvaStart + variantsMatch.index! + variantsMatch[0].length;
        let braceCount = 1;
        let variantsEnd = variantsStart;
        
        for (let i = variantsStart; i < source.length && braceCount > 0; i++) {
          if (source[i] === '{') braceCount++;
          if (source[i] === '}') braceCount--;
          variantsEnd = i;
        }
        
        const variantsBlock = source.substring(variantsStart, variantsEnd);
        const variantPattern = /(\w+)\s*:\s*\{([^}]*)\}/g;
        const variantMatches = [...variantsBlock.matchAll(variantPattern)];
        
        for (const match of variantMatches) {
          const propName = match[1];
          const valuesBlock = match[2];
          const valueMatches = [...valuesBlock.matchAll(/(\w+)\s*:/g)];
          const values = valueMatches.map(m => m[1]);
          if (values.length > 0) {
            variants.push({
              propName,
              values,
              type: 'cva',
            });
          }
        }
      }
    }
    
    const interfacePattern = /(\w+)\s*\?\s*:\s*['"]([^'"]+)['"](?:\s*\|\s*['"]([^'"]+)['"])+/g;
    const interfaceMatches = source.matchAll(interfacePattern);
    
    for (const match of interfaceMatches) {
      const propName = match[1];
      const fullMatch = match[0];
      const values = [...fullMatch.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      if (values.length > 1) {
        variants.push({
          propName,
          values,
          type: 'union',
        });
      }
    }
    
    return variants;
  }

  private detectComponentType(source: string): { isServerComponent: boolean; isClientComponent: boolean } {
    const hasUseClient = /['"]use client['"]/.test(source);
    const hasUseServer = /['"]use server['"]/.test(source);
    
    return {
      isServerComponent: !hasUseClient && !hasUseServer,
      isClientComponent: hasUseClient,
    };
  }

  private detectForwardRef(source: string, componentName: string): boolean {
    const forwardRefPattern = new RegExp(`(React\\.)?forwardRef.*${componentName}|${componentName}.*=.*forwardRef`, 's');
    return forwardRefPattern.test(source);
  }

  private detectExportType(source: string, componentName: string): 'named' | 'default' {
    const defaultExport = new RegExp(`export\\s+default\\s+${componentName}`);
    return defaultExport.test(source) ? 'default' : 'named';
  }

  private detectDeprecated(description?: string): boolean {
    if (!description) return false;
    return /@deprecated/i.test(description);
  }

  private manualParse(filePath: string, source: string): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    
    const functionComponentPattern = /export\s+(const|function)\s+(\w+)\s*(?:=\s*(?:\(.*?\)|React\.forwardRef))?\s*(?::\s*React\.FC)?/g;
    const matches = source.matchAll(functionComponentPattern);
    
    for (const match of matches) {
      const name = match[2];
      if (name && /^[A-Z]/.test(name)) {
        const { isServerComponent, isClientComponent } = this.detectComponentType(source);
        
        components.push({
          name,
          filePath: path.relative(this.options.rootDir, filePath),
          exportType: this.detectExportType(source, name),
          props: [],
          variants: [],
          usageExamples: [],
          isServerComponent,
          isClientComponent,
          isForwardRef: this.detectForwardRef(source, name),
        });
      }
    }
    
    return components;
  }

  private async enrichWithUsageExamples(components: ComponentInfo[]): Promise<void> {
    const allFiles = this.findComponentFiles();
    const componentMap = new Map(components.map(c => [c.name, c]));
    
    for (const file of allFiles) {
      try {
        const source = fs.readFileSync(file, 'utf-8');
        const lines = source.split('\n');
        
        for (const [name, component] of componentMap) {
          if (component.usageExamples.length >= this.options.maxExamples) continue;
          
          const pattern = new RegExp(`<${name}(?:\\s|>)`, 'g');
          let match;
          
          while ((match = pattern.exec(source)) !== null && component.usageExamples.length < this.options.maxExamples) {
            const lineNumber = source.substring(0, match.index).split('\n').length;
            const startLine = Math.max(0, lineNumber - 2);
            const endLine = Math.min(lines.length, lineNumber + 2);
            const code = lines.slice(startLine, endLine).join('\n');
            
            if (path.relative(this.options.rootDir, file) !== component.filePath) {
              component.usageExamples.push({
                file: path.relative(this.options.rootDir, file),
                lineNumber,
                code,
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to extract examples from ${file}:`, error);
      }
    }
  }
}
