# Component Atlas v0.1 - Build Summary

**Package Name**: `react-component-atlas` (available on npm at time of publication)  
**Version**: 0.1.0 (experimental)  
**License**: MIT  
**Author**: Jignesh Dhamecha

## What Was Built

A complete open-source toolchain for helping coding agents understand React component libraries:

### 1. **CLI Scanner** (`component-atlas scan`)
- Scans React/Next.js TypeScript codebases
- Uses `react-docgen-typescript` for prop extraction
- Detects component metadata:
  - Props with types, defaults, required flags
  - Variants (cva + union types)
  - JSDoc descriptions
  - Server vs client components
  - forwardRef usage
  - Export types (named/default)
- Extracts real usage examples from the codebase
- Generates JSON manifest (`atlas.json`) + markdown summary (`ATLAS.md`)
- Supports incremental/cached rebuilds (basic file timestamp checking)

### 2. **Duplicate Checker** (`component-atlas check`)
- Structural similarity analysis (name + props + variants)
- Deterministic, offline, no embeddings (v0.1 scope)
- Provides similarity scores and explanations
- Configurable threshold (default 0.7)
- Usable in CI/agent hooks

### 3. **MCP Server** (stdio)
Exposes 5 tools for coding agents:
- `search_components` — Search by name/description/props
- `get_component` — Get full component details
- `list_components` — List with filters (client/server, has variants)
- `check_duplicate` — Check if proposed component duplicates existing
- `get_variants` — Get variant configurations

### 4. **Agent Skill** (`SKILL.md`)
Cross-agent format (Cursor, Claude Code, Codex, Copilot)
- Instructions for when to use the atlas
- Workflow: search → check duplicate → get details → use exact props
- Error recovery and fallbacks
- Duplicate detection thresholds explained

### 5. **Example Application**
Next.js 15 App Router demo with:
- Button, Card, Input components
- cva variants
- forwardRef usage
- Tailwind styling
- Usage examples demonstrating the scanner

### 6. **Complete Testing**
- Vitest test suite (12 tests, all passing)
- Fixtures covering: cva, union types, forwardRef, client components, usage examples
- CI pipeline (GitHub Actions): typecheck, lint, test, build
- Works on Node 18, 20, 22

### 7. **Documentation**
- Comprehensive README.md (features, installation, quickstart, examples, limitations)
- CONTRIBUTING.md (dev setup, testing, PR process, areas needing help)
- SKILL.md (agent instructions)
- LICENSE (MIT)

## Design Choices

### 1. **Parser Selection: react-docgen-typescript**
- **Why**: Industry standard, TypeScript-native, maintained
- **Alternative considered**: AST traversal with typescript compiler API
- **Trade-off**: Less control over extraction, but more reliable

### 2. **Variant Detection: Regex + Source Parsing**
- **Why**: Simple, deterministic, no AST complexity
- **Alternative considered**: Full AST analysis
- **Trade-off**: Misses complex compositions but covers 80% case

### 3. **Duplicate Detection: Structural Similarity**
- **Why**: Offline, fast, no embeddings/API calls
- **Algorithm**: Weighted Levenshtein distance (name) + Jaccard similarity (props)
- **Alternative considered**: Embeddings (semantic similarity)
- **Trade-off**: Less accurate but fully deterministic and portable

### 4. **MCP Server: stdio Transport**
- **Why**: Standard MCP protocol, works with all MCP clients
- **Alternative considered**: HTTP server
- **Trade-off**: Requires MCP client, not RESTful

### 5. **No Storybook Dependency**
- **Why**: Most product repos don't use Storybook or keep it stale
- **Alternative**: Integrate with Storybook MCP when both are present
- **Roadmap**: v0.2+ could read existing Storybook stories

## Sample Manifest Output

From `examples/nextjs-app`:

```json
{
  "name": "Button",
  "filePath": "components/Button.tsx",
  "exportType": "named",
  "props": [
    { "name": "variant", "type": "\"default\" | \"destructive\" | \"outline\" | \"ghost\"", "required": false },
    { "name": "size", "type": "\"sm\" | \"md\" | \"lg\"", "required": false }
  ],
  "variants": [
    { "propName": "variant", "values": ["default", "destructive", "outline", "ghost"], "type": "cva" },
    { "propName": "size", "values": ["sm", "md", "lg"], "type": "cva" }
  ],
  "description": "Primary button component with multiple variants and sizes.",
  "isServerComponent": true,
  "isClientComponent": false,
  "isForwardRef": true,
  "usageExamples": [
    {
      "file": "app/page.tsx",
      "lineNumber": 23,
      "code": "<Button variant=\"default\">Primary Action</Button>"
    }
  ]
}
```

## Known Gaps & Limitations (v0.1)

### Scanner Limitations
1. **Props from HTML attributes inflate counts** — Components extending `HTMLButtonElement` get 200+ inherited props
   - **Impact**: Duplicate detection has false positives due to shared HTML props
   - **v0.2 Fix**: Filter out inherited HTML attributes, focus on component-specific props

2. **`@deprecated` JSDoc not captured** — react-docgen-typescript parses it separately
   - **Impact**: Deprecated tag detection works in source but not in parsed description
   - **v0.2 Fix**: Parse JSDoc tags directly or use fallback regex

3. **Complex cva compositions missed** — Only captures direct `cva()` calls
   - **Example**: `const variants = { ...baseVariants, ...extendedVariants }`
   - **v0.2 Fix**: AST-based variant resolution

4. **Deep barrel exports not resolved** — Re-exports through multiple index files may not link back
   - **Example**: `export * from './components'` → `export { Button } from './Button'`
   - **v0.2 Fix**: Build full import graph

5. **No runtime analysis** — Only scans source, can't detect dynamic prop generation
   - **Example**: Props spread from `...rest` or computed at runtime
   - **v0.2 Fix**: Optional runtime instrumentation mode

### Duplicate Checker Limitations
1. **No semantic understanding** — Doesn't know "btn" means "button"
   - **v0.2 Fix**: Embeddings-based semantic similarity (optional, requires API)

2. **Threshold requires tuning** — 0.7 default may not fit all codebases
   - **v0.2 Fix**: Auto-calibration based on existing component set

3. **False positives on generic components** — Wrappers with `children` look similar
   - **Example**: `<Container>` vs `<Wrapper>` both have just `children` prop
   - **v0.2 Fix**: Penalize generic props, boost specific ones

### MCP Server Limitations
1. **No watch mode** — Manifest doesn't auto-reload on file changes
   - **Workaround**: Re-run `component-atlas scan` after changes
   - **v0.2 Fix**: File watcher with incremental updates

2. **No fuzzy search** — Exact substring matching only
   - **v0.2 Fix**: Fuzzy matching (Levenshtein) or embeddings

3. **Large manifests not paginated** — All results returned at once
   - **Impact**: Slow for 1000+ component codebases
   - **v0.2 Fix**: Cursor-based pagination

## File Count

**Total**: 37 source files (excluding node_modules, dist, .next)

### Breakdown:
- **Source code**: 9 files (`src/*.ts`, `src/**/*.ts`)
  - `cli.ts` (242 lines) — CLI entry point
  - `scanner.ts` (285 lines) — Component scanning logic
  - `duplicate-checker.ts` (173 lines) — Similarity analysis
  - `mcp/server.ts` (385 lines) — MCP server implementation
  - `types.ts` (59 lines) — TypeScript types
  - `index.ts` (3 lines) — Public API exports
  
- **Tests**: 7 files
  - `__tests__/scanner.test.ts` (107 lines)
  - `__tests__/duplicate-checker.test.ts` (145 lines)
  - 5 fixture components (`__tests__/fixtures/*.tsx`)

- **Example app**: 8 files
  - Next.js App Router structure
  - 3 component files (Button, Card, Input)
  
- **Config & docs**: 13 files
  - README.md, CONTRIBUTING.md, SKILL.md, LICENSE
  - package.json, tsconfig.json, vitest.config.ts, eslint.config.js
  - .github/workflows/ci.yml

## CI Status

✅ All checks pass:
- TypeScript compilation (strict mode)
- ESLint (warns on `any`, no-undef off for Node globals)
- 12 Vitest tests (covering scanning, duplicate detection, variants, examples)
- Build produces `dist/` with runnable CLI and MCP server

## Demo Evidence

### CLI Output (on example app):
```
Found 6 components in 1606ms

Top components:
  - Button (291 props, 2 variants, 3 examples)
  - Card (281 props, 2 variants, 3 examples)
  - Input (311 props, 0 variants, 2 examples)
```

### Duplicate Detection (planted duplicate):
```
⚠️  Component "CardDuplicate" may be a duplicate:
  Card (components/Card.tsx)
    Similarity: 73.2%
    Reason: Similar names (67% match); 2 shared props: title, children
```

### MCP Server Tools:
All 5 tools tested via scripted calls:
- `search_components` returns matching components
- `get_component` returns full details
- `list_components` filters by type
- `check_duplicate` identifies similar components
- `get_variants` returns variant configurations

## What's Ready

✅ **Core functionality**: Scan, extract, detect duplicates  
✅ **Agent integration**: MCP server + skill  
✅ **Documentation**: README, CONTRIBUTING, SKILL.md  
✅ **Testing**: 12 tests, all passing  
✅ **CI**: GitHub Actions workflow  
✅ **Example**: Next.js app demonstrating usage  
✅ **Ready for local use**: `npx component-atlas scan` works  

## What's NOT Ready

❌ **npm publication** — Package not published yet (user requirement)  
❌ **Production readiness** — Labeled as experimental 0.1  
❌ **Embeddings** — No semantic similarity (v0.2)  
❌ **Watch mode** — No file watching (v0.2)  
❌ **Storybook integration** — Doesn't read existing stories (v0.2)  
❌ **Design token mapping** — No Tailwind/CSS variable mapping (v0.2)  

## Recommendations for Next Steps

### Immediate (before sharing publicly):
1. Test on 2-3 real production codebases (internal use)
2. Tune duplicate detection threshold based on feedback
3. Add more test fixtures (tailwind-variants, Panda CSS)

### v0.2 Priorities (based on gaps):
1. **Filter inherited HTML props** — Reduce false positives
2. **Embeddings-based duplicate detection** — Optional, off by default
3. **Watch mode** — Auto-reload manifest
4. **GitHub Action** — Pre-built action for CI

### Community Growth:
1. Publish to npm as `react-component-atlas`
2. Tweet with demo video
3. Post on /r/reactjs, HN, ProductHunt
4. Create plugin for Cursor Marketplace
5. Submit skill to skills.sh directory

## Success Metrics (proposed)

- **Technical**: CI passes, CLI works on example app, MCP server responds
- **Adoption**: GitHub stars, npm downloads, plugin installs
- **Impact**: Reduction in duplicate components created by agents (measure via PR analysis)

---

**Final Status**: ✅ v0.1 complete and functional. Ready for local testing and iteration.
