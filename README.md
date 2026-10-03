# react-component-atlas

**Experimental v0.1** — Scan React/Next.js codebases to build a manifest of components for coding agents. Stop hallucinating props and duplicating components.

## The Problem

Coding agents working in React/Next.js codebases:
- Invent component props that don't exist
- Ignore existing component variants (size, color, etc.)
- Create near-duplicate components because they don't know what already exists
- Can't discover your design system without Storybook

Teams currently write things like **"CRITICAL: Never hallucinate component properties!"** in their `AGENTS.md` files.

## What It Does

`react-component-atlas` is a CLI tool, MCP server, and agent skill that:

1. **Scans** your React/Next.js TypeScript codebase
2. **Extracts** component metadata:
   - Props with types, defaults, and required flags
   - Variants (cva, tailwind-variants, union types)
   - JSDoc descriptions and `@deprecated` tags
   - Real usage examples from your codebase
   - Server vs client components, forwardRef detection
3. **Outputs** a JSON manifest + agent-readable markdown summary
4. **Serves** component info to agents via MCP tools
5. **Checks** for duplicate components in CI or agent hooks

No Storybook required. Works with any React/Next.js codebase.

## Installation

```bash
npm install -g react-component-atlas
# or
npx react-component-atlas scan
```

## Quick Start

### 1. Scan Your Codebase

```bash
cd your-nextjs-project
component-atlas scan
```

This generates:
- `atlas.json` — Full component manifest
- `ATLAS.md` — Human/agent-readable summary

### 2. Use with Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` or user settings):

```json
{
  "mcpServers": {
    "component-atlas": {
      "command": "npx",
      "args": ["-y", "react-component-atlas/mcp"]
    }
  }
}
```

### 3. Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "component-atlas": {
      "command": "npx",
      "args": ["-y", "react-component-atlas/mcp"]
    }
  }
}
```

### 4. Add the Agent Skill

Copy `SKILL.md` from this repo to your project or install via:

```bash
npx skills add react-component-atlas
```

The skill tells agents to:
1. Search the atlas before creating components
2. Check for duplicates before writing new components
3. Use exact prop names and types from existing components

## CLI Usage

```bash
# Scan with defaults
component-atlas scan

# Customize output
component-atlas scan --root ./src --output components.json --markdown COMPONENTS.md

# Check if a new component duplicates existing ones
component-atlas check src/components/NewButton.tsx

# Adjust duplicate threshold (0-1, default 0.7)
component-atlas check --threshold 0.6 src/components/Card.tsx

# Clear cache
component-atlas clear-cache
```

## MCP Tools

When connected, agents can use these tools:

- **`search_components`** — Search by name, description, or prop name
- **`get_component`** — Get full details for a specific component
- **`list_components`** — List all components with filters (client/server, has variants)
- **`check_duplicate`** — Check if a proposed component duplicates existing ones
- **`get_variants`** — Get variant configurations (cva, union types)

## Example Output

Running `component-atlas scan` on the included Next.js example generates:

```json
{
  "name": "Button",
  "filePath": "src/components/Button.tsx",
  "exportType": "named",
  "props": [
    {
      "name": "variant",
      "type": "\"default\" | \"destructive\" | \"outline\" | \"ghost\"",
      "required": false,
      "defaultValue": "\"default\""
    },
    {
      "name": "size",
      "type": "\"sm\" | \"md\" | \"lg\"",
      "required": false,
      "defaultValue": "\"md\""
    }
  ],
  "variants": [
    {
      "propName": "variant",
      "values": ["default", "destructive", "outline", "ghost"],
      "type": "cva"
    },
    {
      "propName": "size",
      "values": ["sm", "md", "lg"],
      "type": "cva"
    }
  ],
  "isClientComponent": false,
  "isServerComponent": true,
  "isForwardRef": true,
  "usageExamples": [
    {
      "file": "src/app/page.tsx",
      "lineNumber": 23,
      "code": "<Button variant=\"default\">Primary Action</Button>"
    }
  ]
}
```

## Features

✅ TypeScript support with strict types  
✅ Detects cva and tailwind-variants  
✅ Extracts JSDoc descriptions  
✅ Finds real usage examples  
✅ Server vs client component detection  
✅ forwardRef and re-export detection  
✅ Duplicate component checker  
✅ Incremental/cached rebuilds  
✅ MCP server (stdio)  
✅ Agent skill included  
✅ No Storybook required  

## What Works in v0.1

- ✅ TypeScript component scanning via react-docgen-typescript
- ✅ cva variant detection
- ✅ Union-typed props (e.g., `variant: 'a' | 'b'`)
- ✅ forwardRef detection
- ✅ Server/client component detection
- ✅ JSDoc and `@deprecated` tags
- ✅ Usage example mining
- ✅ Duplicate checking (name + prop similarity)
- ✅ MCP server with 5 tools
- ✅ Next.js App Router example

## Known Limitations (v0.1)

- **No runtime analysis** — Only scans source files
- **Basic variant detection** — Complex cva compositions may be missed
- **No Storybook integration** — Doesn't read existing Storybook stories
- **No embeddings** — Duplicate detection uses structural similarity only
- **No incremental re-scan** — Cache is per-file timestamp only
- **Limited re-export handling** — Deep barrel exports may not resolve fully
- **English JSDoc only** — No i18n support

## Roadmap (Post v0.1)

- [ ] Embeddings-based semantic duplicate detection
- [ ] Storybook story integration
- [ ] Design token mapping (Tailwind, CSS variables)
- [ ] Component relationship graph
- [ ] Watch mode for dev servers
- [ ] GitHub Action for PR checks
- [ ] VS Code extension
- [ ] Support for Vue/Svelte (community-driven)

## CI Integration

Add to your CI to flag duplicate components:

```yaml
# .github/workflows/ci.yml
- name: Check for duplicate components
  run: |
    npx react-component-atlas scan
    npx react-component-atlas check src/components/**/*.tsx
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup
- Running tests
- Adding features
- Submitting PRs

## License

MIT — See [LICENSE](./LICENSE)

## Why This Exists

Current solutions:
- **Storybook MCP** — Requires Storybook, opt-in manifest, framework-specific
- **shadcn MCP** — Only covers shadcn registry components
- **Code comments** — Agents ignore them or hallucinate anyway

This tool:
- Works with **any** React/Next.js codebase
- Requires **no Storybook** or special setup
- Provides **structural component data** agents can query
- Catches **duplicates before they're created**

## Credits

Built by [Jignesh Dhamecha](https://github.com/djig) based on research into agentic frontend development gaps (Oct 2026).

Inspired by:
- Storybook's component manifests
- react-docgen-typescript
- The pain of agents inventing `Button2.tsx`

## Package Name Note

**npm package**: `react-component-atlas` (available at time of publication)  
**Alternative considered**: `@component-atlas/*` (namespace taken by another project)

---

**Status**: Experimental v0.1 — Not published to npm yet. Try it locally first.
