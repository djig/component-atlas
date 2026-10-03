import type { ComponentInfo, ComponentManifest } from './types.js';

export class DuplicateChecker {
  private components: ComponentInfo[];

  constructor(components: ComponentInfo[]) {
    this.components = components;
  }

  checkDuplicate(component: ComponentInfo, threshold = 0.7): {
    isDuplicate: boolean;
    similarComponents: Array<{
      name: string;
      filePath: string;
      similarity: number;
      reason: string;
    }>;
  } {
    const similar = this.components
      .filter(c => c.name !== component.name)
      .map(existing => {
        const similarity = this.calculateSimilarity(component, existing);
        const reason = this.explainSimilarity(component, existing, similarity);
        return {
          name: existing.name,
          filePath: existing.filePath,
          similarity,
          reason,
        };
      })
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return {
      isDuplicate: similar.length > 0,
      similarComponents: similar,
    };
  }

  private calculateSimilarity(comp1: ComponentInfo, comp2: ComponentInfo): number {
    let score = 0;
    let weight = 0;

    const nameSimilarity = this.stringSimilarity(comp1.name, comp2.name);
    score += nameSimilarity * 0.3;
    weight += 0.3;

    const propSimilarity = this.propsSimilarity(comp1.props, comp2.props);
    score += propSimilarity * 0.5;
    weight += 0.5;

    if (comp1.variants.length > 0 || comp2.variants.length > 0) {
      const variantSimilarity = this.variantsSimilarity(comp1.variants, comp2.variants);
      score += variantSimilarity * 0.2;
      weight += 0.2;
    }

    return weight > 0 ? score / weight : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private propsSimilarity(props1: any[], props2: any[]): number {
    if (props1.length === 0 && props2.length === 0) return 1;
    if (props1.length === 0 || props2.length === 0) return 0;

    const names1 = new Set(props1.map(p => p.name));
    const names2 = new Set(props2.map(p => p.name));
    
    const intersection = new Set([...names1].filter(x => names2.has(x)));
    const union = new Set([...names1, ...names2]);
    
    const nameSim = intersection.size / union.size;

    const types1 = new Set(props1.map(p => `${p.name}:${p.type}`));
    const types2 = new Set(props2.map(p => `${p.name}:${p.type}`));
    const typeIntersection = new Set([...types1].filter(x => types2.has(x)));
    const typeSim = typeIntersection.size / Math.max(types1.size, types2.size);

    return (nameSim * 0.6) + (typeSim * 0.4);
  }

  private variantsSimilarity(variants1: any[], variants2: any[]): number {
    if (variants1.length === 0 && variants2.length === 0) return 1;
    if (variants1.length === 0 || variants2.length === 0) return 0;

    const props1 = new Set(variants1.map(v => v.propName));
    const props2 = new Set(variants2.map(v => v.propName));
    
    const intersection = new Set([...props1].filter(x => props2.has(x)));
    return intersection.size / Math.max(props1.size, props2.size);
  }

  private explainSimilarity(comp1: ComponentInfo, comp2: ComponentInfo, similarity: number): string {
    const reasons: string[] = [];

    const nameSim = this.stringSimilarity(comp1.name, comp2.name);
    if (nameSim > 0.6) {
      reasons.push(`Similar names (${(nameSim * 100).toFixed(0)}% match)`);
    }

    const propSim = this.propsSimilarity(comp1.props, comp2.props);
    if (propSim > 0.6) {
      const commonProps = comp1.props
        .filter(p1 => comp2.props.some(p2 => p2.name === p1.name))
        .map(p => p.name);
      reasons.push(`${commonProps.length} shared props: ${commonProps.slice(0, 5).join(', ')}${commonProps.length > 5 ? '...' : ''}`);
    }

    const variantSim = this.variantsSimilarity(comp1.variants, comp2.variants);
    if (variantSim > 0.5 && comp1.variants.length > 0) {
      const commonVariants = comp1.variants
        .filter(v1 => comp2.variants.some(v2 => v2.propName === v1.propName))
        .map(v => v.propName);
      reasons.push(`Shared variant props: ${commonVariants.join(', ')}`);
    }

    return reasons.join('; ') || `${(similarity * 100).toFixed(0)}% structural similarity`;
  }
}

export function generateMarkdownSummary(manifest: ComponentManifest): string {
  const lines: string[] = [];
  
  lines.push('# Component Atlas');
  lines.push('');
  lines.push(`Generated: ${manifest.generatedAt}`);
  lines.push(`Root: ${manifest.rootDir}`);
  lines.push(`Components: ${manifest.components.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const component of manifest.components) {
    lines.push(`## ${component.name}`);
    lines.push('');
    lines.push(`**File:** \`${component.filePath}\``);
    lines.push(`**Export:** ${component.exportType}`);
    
    if (component.isClientComponent) {
      lines.push(`**Type:** Client Component`);
    } else if (component.isServerComponent) {
      lines.push(`**Type:** Server Component`);
    }
    
    if (component.isForwardRef) {
      lines.push(`**forwardRef:** Yes`);
    }
    
    if (component.deprecated) {
      lines.push('**DEPRECATED**');
    }
    
    if (component.description) {
      lines.push('');
      lines.push(component.description);
    }
    
    lines.push('');
    lines.push('### Props');
    lines.push('');
    
    if (component.props.length === 0) {
      lines.push('*No props documented*');
    } else {
      for (const prop of component.props) {
        const required = prop.required ? '**required**' : 'optional';
        const defaultVal = prop.defaultValue ? ` (default: \`${prop.defaultValue}\`)` : '';
        lines.push(`- **${prop.name}**: \`${prop.type}\` - ${required}${defaultVal}`);
        if (prop.description) {
          lines.push(`  ${prop.description}`);
        }
      }
    }
    
    if (component.variants.length > 0) {
      lines.push('');
      lines.push('### Variants');
      lines.push('');
      for (const variant of component.variants) {
        lines.push(`- **${variant.propName}** (${variant.type}): ${variant.values.map(v => `\`${v}\``).join(', ')}`);
      }
    }
    
    if (component.usageExamples.length > 0) {
      lines.push('');
      lines.push('### Usage Examples');
      lines.push('');
      for (const example of component.usageExamples) {
        lines.push(`**${example.file}:${example.lineNumber}**`);
        lines.push('```tsx');
        lines.push(example.code);
        lines.push('```');
        lines.push('');
      }
    }
    
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}
