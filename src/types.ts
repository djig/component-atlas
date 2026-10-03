/**
 * Component manifest types for react-component-atlas
 */

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ComponentVariant {
  propName: string;
  values: string[];
  type: 'union' | 'cva' | 'tailwind-variants';
}

export interface UsageExample {
  file: string;
  lineNumber: number;
  code: string;
}

export interface ComponentInfo {
  name: string;
  filePath: string;
  exportType: 'named' | 'default';
  props: ComponentProp[];
  variants: ComponentVariant[];
  description?: string;
  deprecated?: boolean;
  usageExamples: UsageExample[];
  isServerComponent?: boolean;
  isClientComponent?: boolean;
  isForwardRef?: boolean;
  extends?: string[];
}

export interface ComponentManifest {
  version: string;
  generatedAt: string;
  rootDir: string;
  components: ComponentInfo[];
}

export interface ScanOptions {
  rootDir: string;
  include?: string[];
  exclude?: string[];
  maxExamples?: number;
  skipVariants?: boolean;
  includeInheritedProps?: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarComponents: Array<{
    name: string;
    filePath: string;
    similarity: number;
    reason: string;
  }>;
}
