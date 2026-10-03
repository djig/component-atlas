import { describe, it, expect } from 'vitest';
import { ComponentScanner } from '../scanner.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('ComponentScanner', () => {
  it('should scan fixture components', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      maxExamples: 3,
    });

    const components = await scanner.scan();
    
    expect(components.length).toBeGreaterThan(0);
    
    const input = components.find(c => c.name === 'Input');
    expect(input).toBeDefined();
    expect(input?.props.length).toBeGreaterThan(0);
  });

  it('should detect component variants from source', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      skipVariants: false,
    });

    const components = await scanner.scan();
    const button = components.find(c => c.name === 'Button');
    
    expect(button).toBeDefined();
    expect(button?.variants.length).toBeGreaterThan(0);
    
    const variantProp = button?.variants.find(v => v.propName === 'variant');
    expect(variantProp).toBeDefined();
    expect(variantProp?.values).toContain('primary');
  });

  it('should detect client components', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
    });

    const components = await scanner.scan();
    const input = components.find(c => c.name === 'Input');
    
    expect(input).toBeDefined();
    expect(input?.isClientComponent).toBe(true);
    expect(input?.isServerComponent).toBe(false);
  });

  it('should detect forwardRef components', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
    });

    const components = await scanner.scan();
    const card = components.find(c => c.name === 'Card');
    
    expect(card).toBeDefined();
    expect(card?.isForwardRef).toBe(true);
  });

  it('should extract descriptions', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
    });

    const components = await scanner.scan();
    const card = components.find(c => c.name === 'Card');
    
    expect(card).toBeDefined();
    expect(card?.description).toBeTruthy();
    expect(card?.description).toContain('Card container');
  });

  it('should extract usage examples', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      maxExamples: 3,
    });

    const components = await scanner.scan();
    const button = components.find(c => c.name === 'Button');
    
    expect(button).toBeDefined();
    expect(button?.usageExamples.length).toBeGreaterThan(0);
    
    const example = button?.usageExamples[0];
    expect(example?.code).toContain('Button');
  });

  it('should detect cva variants', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
    });

    const components = await scanner.scan();
    const card = components.find(c => c.name === 'Card');
    
    const cvaVariant = card?.variants.find(v => v.type === 'cva');
    expect(cvaVariant).toBeDefined();
  });

  it('should extract only component-specific props, not inherited DOM attributes', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      includeInheritedProps: false,
    });

    const components = await scanner.scan();
    
    // Input component has 4 explicitly defined props (type, placeholder, value, onChange)
    // and does not extend HTML attributes, so all props should be extracted
    const input = components.find(c => c.name === 'Input');
    expect(input).toBeDefined();
    expect(input!.props.length).toBe(4);
    expect(input!.props.map(p => p.name)).toEqual(
      expect.arrayContaining(['type', 'placeholder', 'value', 'onChange'])
    );
    
    // Button and Card use forwardRef with extends
    const button = components.find(c => c.name === 'Button');
    expect(button).toBeDefined();
    
    const card = components.find(c => c.name === 'Card');
    expect(card).toBeDefined();
    expect(card!.extends).toBeDefined();
  });

  it('should extract props from forwardRef components with extends and VariantProps', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      includeInheritedProps: false,
    });

    const components = await scanner.scan();
    
    // ForwardRefButton extends ButtonHTMLAttributes and VariantProps,
    // should extract own props (label, icon) from the interface declaration
    const forwardRefButton = components.find(c => c.name === 'ForwardRefButton');
    expect(forwardRefButton).toBeDefined();
    expect(forwardRefButton!.isForwardRef).toBe(true);
    
    const propNames = forwardRefButton!.props.map(p => p.name);
    // Must have own props explicitly declared in the interface
    expect(propNames).toContain('label');
    expect(propNames).toContain('icon');
    // Should NOT have inherited HTML button props like 'disabled', 'type', 'formAction'
    expect(propNames).not.toContain('disabled');
    expect(propNames).not.toContain('formAction');
    expect(propNames).not.toContain('autoFocus');
    // Should have extends info
    expect(forwardRefButton!.extends).toContain('React.ButtonHTMLAttributes<HTMLButtonElement>');
  });

  it('should extract props from memo-wrapped components', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      includeInheritedProps: false,
    });

    const components = await scanner.scan();
    
    // MemoButton is wrapped with React.memo and has explicit props
    const memoButton = components.find(c => c.name === 'MemoButton');
    expect(memoButton).toBeDefined();
    
    const propNames = memoButton!.props.map(p => p.name);
    expect(propNames).toContain('variant');
    expect(propNames).toContain('children');
    // Should not extract HTML attributes since it doesn't extend them
    expect(memoButton!.props.length).toBeLessThanOrEqual(5);
  });
});
