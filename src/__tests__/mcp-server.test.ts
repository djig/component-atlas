import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const manifestPath = path.join('/tmp', 'test-mcp-atlas.json');

describe('MCP Server', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    const { ComponentScanner } = await import('../scanner.js');
    const scanner = new ComponentScanner({
      rootDir: fixturesDir,
      includeInheritedProps: false,
    });

    const components = await scanner.scan();
    const manifest = {
      version: '0.1.0',
      generatedAt: new Date().toISOString(),
      rootDir: fixturesDir,
      components,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const configPath = path.join('/tmp', 'atlas-test-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      manifestPath,
    }));

    const serverPath = path.join(__dirname, '..', '..', 'dist', 'mcp', 'server.js');

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      env: { 
        ...process.env,
        COMPONENT_ATLAS_CONFIG: configPath,
      },
    });

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    const configPath = path.join('/tmp', 'atlas-test-config.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  it('should list available tools', async () => {
    const result = await client.listTools();
    
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBe(5);
    
    const toolNames = result.tools.map(t => t.name);
    expect(toolNames).toContain('search_components');
    expect(toolNames).toContain('get_component');
    expect(toolNames).toContain('list_components');
    expect(toolNames).toContain('check_duplicate');
    expect(toolNames).toContain('get_variants');
  });

  it('should search components', async () => {
    const result = await client.callTool({
      name: 'search_components',
      arguments: {
        query: 'button',
        limit: 10,
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const content = result.content[0];
    expect(content.type).toBe('text');
    
    if ('text' in content) {
      const data = JSON.parse(content.text);
      expect(data.found).toBeGreaterThan(0);
      expect(data.components).toBeDefined();
    }
  });

  it('should get a specific component', async () => {
    const result = await client.callTool({
      name: 'get_component',
      arguments: {
        name: 'Button',
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const content = result.content[0];
    expect(content.type).toBe('text');
    
    if ('text' in content) {
      const component = JSON.parse(content.text);
      expect(component.name).toBe('Button');
      expect(component.props).toBeDefined();
      expect(component.variants).toBeDefined();
    }
  });

  it('should list components with filters', async () => {
    const result = await client.callTool({
      name: 'list_components',
      arguments: {
        type: 'all',
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const content = result.content[0];
    expect(content.type).toBe('text');
    
    if ('text' in content) {
      const data = JSON.parse(content.text);
      expect(data.total).toBeGreaterThan(0);
      expect(data.components).toBeDefined();
      expect(Array.isArray(data.components)).toBe(true);
    }
  });

  it('should check for duplicates', async () => {
    const result = await client.callTool({
      name: 'check_duplicate',
      arguments: {
        name: 'MyButton',
        props: [
          { name: 'onClick', type: 'function', required: false },
          { name: 'label', type: 'string', required: true },
        ],
        threshold: 0.3,
      },
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const content = result.content[0];
    expect(content.type).toBe('text');
    
    if ('text' in content) {
      const data = JSON.parse(content.text);
      expect(data.isDuplicate).toBeDefined();
      expect(data.similarComponents).toBeDefined();
      expect(data.recommendation).toBeDefined();
    }
  });

  it('should get variants', async () => {
    const result = await client.callTool({
      name: 'get_variants',
      arguments: {},
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    
    const content = result.content[0];
    expect(content.type).toBe('text');
    
    if ('text' in content) {
      const data = JSON.parse(content.text);
      expect(data.components).toBeDefined();
      expect(Array.isArray(data.components)).toBe(true);
    }
  });
});
