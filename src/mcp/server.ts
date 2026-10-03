#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import type { ComponentManifest, ComponentInfo } from '../types.js';
import { DuplicateChecker } from '../duplicate-checker.js';

interface ServerConfig {
  manifestPath?: string;
  autoReload?: boolean;
}

class ComponentAtlasMcpServer {
  private server: Server;
  private manifest: ComponentManifest | null = null;
  private manifestPath: string;
  private autoReload: boolean;

  constructor(config: ServerConfig = {}) {
    this.manifestPath = config.manifestPath || path.join(process.cwd(), 'atlas.json');
    this.autoReload = config.autoReload ?? true;

    this.server = new Server(
      {
        name: 'component-atlas',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.loadManifest();
  }

  private loadManifest(): void {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const data = fs.readFileSync(this.manifestPath, 'utf-8');
        this.manifest = JSON.parse(data);
        console.error(`Loaded manifest with ${this.manifest?.components.length || 0} components`);
      } else {
        console.error(`Manifest not found at ${this.manifestPath}`);
      }
    } catch (error) {
      console.error('Failed to load manifest:', error);
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_components',
          description: 'Search for components by name, description, or prop names. Returns matching components with their props and usage examples.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (component name, description, or prop name)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_component',
          description: 'Get detailed information about a specific component by exact name, including all props, variants, and usage examples.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Exact component name',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'list_components',
          description: 'List all available components with optional filtering.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['client', 'server', 'all'],
                description: 'Filter by component type (default: all)',
              },
              hasVariants: {
                type: 'boolean',
                description: 'Filter components that have variants',
              },
            },
          },
        },
        {
          name: 'check_duplicate',
          description: 'Check if a proposed component (by description or structure) duplicates an existing component. Returns similar components with similarity scores and reasons.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Proposed component name',
              },
              description: {
                type: 'string',
                description: 'Description of what the component does',
              },
              props: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                  },
                  required: ['name', 'type'],
                },
                description: 'Proposed component props',
              },
              threshold: {
                type: 'number',
                description: 'Similarity threshold 0-1 (default: 0.7)',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_variants',
          description: 'Get all variant configurations for components, useful for understanding available design system options.',
          inputSchema: {
            type: 'object',
            properties: {
              componentName: {
                type: 'string',
                description: 'Specific component name (optional, returns all if omitted)',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (this.autoReload) {
        this.loadManifest();
      }

      if (!this.manifest) {
        throw new McpError(
          ErrorCode.InternalError,
          'Manifest not loaded. Run "component-atlas scan" first.'
        );
      }

      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_components':
          return this.searchComponents(args as any);
        case 'get_component':
          return this.getComponent(args as any);
        case 'list_components':
          return this.listComponents(args as any);
        case 'check_duplicate':
          return this.checkDuplicate(args as any);
        case 'get_variants':
          return this.getVariants(args as any);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    });
  }

  private searchComponents(args: { query: string; limit?: number }) {
    const { query, limit = 10 } = args;
    const lowerQuery = query.toLowerCase();

    const results = this.manifest!.components
      .filter(c => {
        return (
          c.name.toLowerCase().includes(lowerQuery) ||
          c.description?.toLowerCase().includes(lowerQuery) ||
          c.props.some(p => p.name.toLowerCase().includes(lowerQuery)) ||
          c.filePath.toLowerCase().includes(lowerQuery)
        );
      })
      .slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              found: results.length,
              components: results.map(c => ({
                name: c.name,
                filePath: c.filePath,
                description: c.description,
                props: c.props,
                variants: c.variants,
                usageExamples: c.usageExamples.slice(0, 2),
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private getComponent(args: { name: string }) {
    const component = this.manifest!.components.find(c => c.name === args.name);

    if (!component) {
      throw new McpError(ErrorCode.InvalidRequest, `Component not found: ${args.name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(component, null, 2),
        },
      ],
    };
  }

  private listComponents(args: { type?: 'client' | 'server' | 'all'; hasVariants?: boolean }) {
    const { type = 'all', hasVariants } = args;

    let filtered = this.manifest!.components;

    if (type === 'client') {
      filtered = filtered.filter(c => c.isClientComponent);
    } else if (type === 'server') {
      filtered = filtered.filter(c => c.isServerComponent);
    }

    if (hasVariants !== undefined) {
      filtered = filtered.filter(c => hasVariants ? c.variants.length > 0 : c.variants.length === 0);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total: filtered.length,
              components: filtered.map(c => ({
                name: c.name,
                filePath: c.filePath,
                exportType: c.exportType,
                propsCount: c.props.length,
                variantsCount: c.variants.length,
                isClientComponent: c.isClientComponent,
                isServerComponent: c.isServerComponent,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private checkDuplicate(args: {
    name: string;
    description?: string;
    props?: Array<{ name: string; type: string; required?: boolean }>;
    threshold?: number;
  }) {
    const { name, description, props = [], threshold = 0.7 } = args;

    const proposedComponent: ComponentInfo = {
      name,
      filePath: '',
      exportType: 'named',
      props: props.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required ?? false,
      })),
      variants: [],
      description,
      usageExamples: [],
    };

    const checker = new DuplicateChecker(this.manifest!.components);
    const result = checker.checkDuplicate(proposedComponent, threshold);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              proposedComponent: name,
              isDuplicate: result.isDuplicate,
              similarComponents: result.similarComponents,
              recommendation: result.isDuplicate
                ? `Consider reusing ${result.similarComponents[0].name} instead of creating a new component.`
                : 'No similar components found. Safe to create.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private getVariants(args: { componentName?: string }) {
    const components = args.componentName
      ? this.manifest!.components.filter(c => c.name === args.componentName)
      : this.manifest!.components.filter(c => c.variants.length > 0);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              components: components.map(c => ({
                name: c.name,
                filePath: c.filePath,
                variants: c.variants,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Component Atlas MCP server running on stdio');
  }
}

const configPath = process.env.COMPONENT_ATLAS_CONFIG || path.join(process.cwd(), 'atlas.config.json');
let config: ServerConfig = {};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

const server = new ComponentAtlasMcpServer(config);
server.run().catch(console.error);
