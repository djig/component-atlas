#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { ComponentScanner } from './scanner.js';
import { DuplicateChecker, generateMarkdownSummary } from './duplicate-checker.js';
import type { ComponentManifest } from './types.js';

const CACHE_FILE = '.component-atlas-cache.json';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'scan':
      await scan(args.slice(1));
      break;
    case 'check':
      await check(args.slice(1));
      break;
    case 'clear-cache':
      clearCache();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
component-atlas - Component manifest builder for coding agents

USAGE:
  component-atlas scan [options]      Scan codebase and generate manifest
  component-atlas check <file>        Check if component duplicates existing ones
  component-atlas clear-cache         Clear the component cache
  component-atlas help                Show this help

SCAN OPTIONS:
  --root <dir>              Root directory to scan (default: current directory)
  --output <file>           Output file for JSON manifest (default: atlas.json)
  --markdown <file>         Output file for markdown summary (default: ATLAS.md)
  --include <pattern>       File patterns to include (can be repeated)
  --exclude <pattern>       File patterns to exclude (can be repeated)
  --max-examples <n>        Maximum usage examples per component (default: 3)
  --skip-variants           Skip variant detection
  --include-inherited       Include inherited DOM/HTML props (default: false)
  --no-cache                Disable incremental caching

CHECK OPTIONS:
  --threshold <n>           Similarity threshold 0-1 (default: 0.7)
  --manifest <file>         Manifest file to check against (default: atlas.json)

EXAMPLES:
  component-atlas scan
  component-atlas scan --root ./src --output components.json
  component-atlas check src/components/NewButton.tsx
  component-atlas check --threshold 0.6 src/components/Card.tsx
`);
}

async function scan(args: string[]) {
  const options = {
    rootDir: process.cwd(),
    outputFile: 'atlas.json',
    markdownFile: 'ATLAS.md',
    include: [] as string[],
    exclude: [] as string[],
    maxExamples: 3,
    skipVariants: false,
    includeInheritedProps: false,
    useCache: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--root':
        options.rootDir = path.resolve(args[++i]);
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--markdown':
        options.markdownFile = args[++i];
        break;
      case '--include':
        options.include.push(args[++i]);
        break;
      case '--exclude':
        options.exclude.push(args[++i]);
        break;
      case '--max-examples':
        options.maxExamples = parseInt(args[++i], 10);
        break;
      case '--skip-variants':
        options.skipVariants = true;
        break;
      case '--include-inherited':
        options.includeInheritedProps = true;
        break;
      case '--no-cache':
        options.useCache = false;
        break;
    }
  }

  console.log(`Scanning ${options.rootDir}...`);
  const startTime = Date.now();

  const scanner = new ComponentScanner({
    rootDir: options.rootDir,
    include: options.include.length > 0 ? options.include : undefined,
    exclude: options.exclude.length > 0 ? options.exclude : undefined,
    maxExamples: options.maxExamples,
    skipVariants: options.skipVariants,
    includeInheritedProps: options.includeInheritedProps,
  });

  const components = await scanner.scan();
  const duration = Date.now() - startTime;

  const manifest: ComponentManifest = {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    rootDir: options.rootDir,
    components,
  };

  fs.writeFileSync(options.outputFile, JSON.stringify(manifest, null, 2));
  console.log(`✓ Wrote manifest to ${options.outputFile}`);

  const markdown = generateMarkdownSummary(manifest);
  fs.writeFileSync(options.markdownFile, markdown);
  console.log(`✓ Wrote markdown summary to ${options.markdownFile}`);

  console.log(`\nFound ${components.length} components in ${duration}ms`);
  console.log(`\nTop components:`);
  components.slice(0, 10).forEach(c => {
    const propCount = c.props.length;
    const variantCount = c.variants.length;
    const exampleCount = c.usageExamples.length;
    console.log(`  - ${c.name} (${propCount} props, ${variantCount} variants, ${exampleCount} examples)`);
  });

  if (options.useCache) {
    const cache = {
      timestamp: Date.now(),
      files: components.map(c => ({
        path: c.filePath,
        mtime: fs.statSync(path.join(options.rootDir, c.filePath)).mtimeMs,
      })),
    };
    fs.writeFileSync(path.join(options.rootDir, CACHE_FILE), JSON.stringify(cache, null, 2));
  }
}

async function check(args: string[]) {
  let filePath = '';
  let threshold = 0.7;
  let manifestFile = 'atlas.json';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--threshold':
        threshold = parseFloat(args[++i]);
        break;
      case '--manifest':
        manifestFile = args[++i];
        break;
      default:
        if (!filePath) filePath = args[i];
        break;
    }
  }

  if (!filePath) {
    console.error('Error: File path required');
    console.error('Usage: component-atlas check <file> [options]');
    process.exit(1);
  }

  if (!fs.existsSync(manifestFile)) {
    console.error(`Error: Manifest file not found: ${manifestFile}`);
    console.error('Run "component-atlas scan" first to generate the manifest');
    process.exit(1);
  }

  const manifest: ComponentManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  
  const scanner = new ComponentScanner({
    rootDir: process.cwd(),
  });

  console.log(`Checking ${filePath}...`);
  const newComponents = await scanner.scan();
  
  const checker = new DuplicateChecker(manifest.components);
  let foundDuplicates = false;

  for (const component of newComponents) {
    const result = checker.checkDuplicate(component, threshold);
    
    if (result.isDuplicate) {
      foundDuplicates = true;
      console.log(`\n⚠️  Component "${component.name}" may be a duplicate:\n`);
      
      for (const similar of result.similarComponents) {
        console.log(`  ${similar.name} (${similar.filePath})`);
        console.log(`    Similarity: ${(similar.similarity * 100).toFixed(1)}%`);
        console.log(`    Reason: ${similar.reason}`);
        console.log('');
      }
    }
  }

  if (!foundDuplicates) {
    console.log('✓ No duplicates found');
  } else {
    process.exit(1);
  }
}

function clearCache() {
  const cachePath = path.join(process.cwd(), CACHE_FILE);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log('✓ Cache cleared');
  } else {
    console.log('No cache file found');
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
