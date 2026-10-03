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

  it('should have realistic prop counts by filtering inherited DOM props', async () => {
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      includeInheritedProps: false,
    });

    const components = await scanner.scan();
    
    const input = components.find(c => c.name === 'Input');
    expect(input).toBeDefined();
    expect(input!.props.length).toBeLessThan(20);
    expect(input!.props.length).toBeGreaterThan(0);
    
    const button = components.find(c => c.name === 'Button');
    if (button && button.props.length > 0) {
      expect(button.props.length).toBeLessThan(20);
    }
  });
});
