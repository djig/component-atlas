import { describe, it, expect } from 'vitest';
import { DuplicateChecker } from '../duplicate-checker.js';
import type { ComponentInfo } from '../types.js';

describe('DuplicateChecker', () => {
  const existingComponents: ComponentInfo[] = [
    {
      name: 'Button',
      filePath: 'components/Button.tsx',
      exportType: 'named',
      props: [
        { name: 'variant', type: 'string', required: false },
        { name: 'size', type: 'string', required: false },
        { name: 'onClick', type: 'function', required: false },
        { name: 'children', type: 'ReactNode', required: true },
      ],
      variants: [
        { propName: 'variant', values: ['primary', 'secondary'], type: 'union' },
      ],
      usageExamples: [],
    },
    {
      name: 'Card',
      filePath: 'components/Card.tsx',
      exportType: 'named',
      props: [
        { name: 'title', type: 'string', required: false },
        { name: 'children', type: 'ReactNode', required: true },
      ],
      variants: [],
      usageExamples: [],
    },
  ];

  it('should detect near-duplicate components by name', () => {
    const checker = new DuplicateChecker(existingComponents);
    
    const newComponent: ComponentInfo = {
      name: 'Btn',
      filePath: 'components/Btn.tsx',
      exportType: 'named',
      props: [
        { name: 'label', type: 'string', required: true },
        { name: 'onClick', type: 'function', required: false },
      ],
      variants: [],
      usageExamples: [],
    };

    const result = checker.checkDuplicate(newComponent, 0.2);
    
    expect(result.isDuplicate).toBe(true);
    expect(result.similarComponents.length).toBeGreaterThan(0);
    expect(result.similarComponents[0].name).toBe('Button');
  });

  it('should detect near-duplicate components by props', () => {
    const checker = new DuplicateChecker(existingComponents);
    
    const newComponent: ComponentInfo = {
      name: 'MyCard',
      filePath: 'components/MyCard.tsx',
      exportType: 'named',
      props: [
        { name: 'title', type: 'string', required: false },
        { name: 'content', type: 'ReactNode', required: true },
      ],
      variants: [],
      usageExamples: [],
    };

    const result = checker.checkDuplicate(newComponent, 0.4);
    
    expect(result.isDuplicate).toBe(true);
    const cardMatch = result.similarComponents.find(c => c.name === 'Card');
    expect(cardMatch).toBeDefined();
  });

  it('should not flag unique components as duplicates', () => {
    const checker = new DuplicateChecker(existingComponents);
    
    const newComponent: ComponentInfo = {
      name: 'Dropdown',
      filePath: 'components/Dropdown.tsx',
      exportType: 'named',
      props: [
        { name: 'options', type: 'string[]', required: true },
        { name: 'selected', type: 'string', required: false },
        { name: 'onSelect', type: 'function', required: true },
      ],
      variants: [],
      usageExamples: [],
    };

    const result = checker.checkDuplicate(newComponent, 0.7);
    
    expect(result.isDuplicate).toBe(false);
    expect(result.similarComponents.length).toBe(0);
  });

  it('should provide similarity reasons', () => {
    const checker = new DuplicateChecker(existingComponents);
    
    const newComponent: ComponentInfo = {
      name: 'ButtonComponent',
      filePath: 'components/ButtonComponent.tsx',
      exportType: 'named',
      props: [
        { name: 'variant', type: 'string', required: false },
        { name: 'onClick', type: 'function', required: false },
      ],
      variants: [],
      usageExamples: [],
    };

    const result = checker.checkDuplicate(newComponent, 0.3);
    
    expect(result.isDuplicate).toBe(true);
    const match = result.similarComponents[0];
    expect(match.reason).toBeTruthy();
    expect(match.reason.length).toBeGreaterThan(0);
  });

  it('should respect similarity threshold', () => {
    const checker = new DuplicateChecker(existingComponents);
    
    const newComponent: ComponentInfo = {
      name: 'Container',
      filePath: 'components/Container.tsx',
      exportType: 'named',
      props: [
        { name: 'children', type: 'ReactNode', required: true },
      ],
      variants: [],
      usageExamples: [],
    };

    const highThreshold = checker.checkDuplicate(newComponent, 0.9);
    expect(highThreshold.isDuplicate).toBe(false);
    
    const lowThreshold = checker.checkDuplicate(newComponent, 0.3);
    expect(lowThreshold.isDuplicate).toBe(true);
  });
});
