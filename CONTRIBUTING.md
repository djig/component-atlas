# Contributing to react-component-atlas

Thank you for considering contributing! This is an experimental v0.1 project, and we welcome improvements.

## Development Setup

### Prerequisites

- Node.js >= 18
- npm or pnpm
- TypeScript knowledge

### Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/react-component-atlas.git
   cd react-component-atlas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Run tests in watch mode during development:
   ```bash
   npm run test:watch
   ```

## Project Structure

```
react-component-atlas/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── scanner.ts             # Component scanning logic
│   ├── duplicate-checker.ts   # Duplicate detection
│   ├── types.ts               # TypeScript types
│   ├── index.ts               # Public API
│   ├── mcp/
│   │   └── server.ts          # MCP server implementation
│   └── __tests__/
│       ├── fixtures/          # Test components
│       ├── scanner.test.ts    # Scanner tests
│       └── duplicate-checker.test.ts
├── examples/
│   └── nextjs-app/            # Example Next.js app
├── SKILL.md                   # Agent skill documentation
├── README.md
├── CONTRIBUTING.md
└── package.json
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Add tests for new functionality

4. Ensure all tests pass:
   ```bash
   npm run ci
   ```

5. Build to verify TypeScript compilation:
   ```bash
   npm run build
   ```

### Testing

We use Vitest for testing. Tests are colocated in `src/__tests__/`.

#### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

#### Test Fixtures

Test fixtures are in `src/__tests__/fixtures/`. These are real React components used to verify scanning behavior.

When adding tests:
- Add fixture components that demonstrate the feature
- Test both success and failure cases
- Test edge cases (no props, no variants, deprecated, etc.)

### Manual Testing

Test the CLI against the example app:

```bash
# Build first
npm run build

# Test scanning
node dist/cli.js scan --root examples/nextjs-app/src

# Test duplicate detection
node dist/cli.js check examples/nextjs-app/src/components/Button.tsx

# Test MCP server (requires MCP client)
node dist/mcp/server.js
```

### Code Style

- **TypeScript**: Use strict mode, avoid `any`
- **Formatting**: 2-space indentation, single quotes
- **Linting**: Run `npm run lint` before committing
- **Comments**: Explain *why*, not *what* (code should be self-documenting)

### Type Safety

- All functions must have explicit return types
- Use `unknown` over `any` when type is truly unknown
- Prefer interfaces over type aliases for objects
- Export types that are part of the public API

## Adding Features

### Adding a New Scanner Feature

1. Update `ComponentInfo` type in `types.ts` if new metadata is needed
2. Add extraction logic in `scanner.ts`
3. Add test fixtures demonstrating the feature
4. Write tests in `scanner.test.ts`
5. Update README.md with the new capability

### Adding a New MCP Tool

1. Add tool definition to `ListToolsRequestSchema` handler in `mcp/server.ts`
2. Implement tool logic in a new method
3. Add to `CallToolRequestSchema` switch statement
4. Update README.md MCP Tools section
5. Update SKILL.md with usage instructions

### Adding Support for a New Variant System

1. Add variant type to `ComponentVariant['type']` in `types.ts`
2. Add detection logic to `extractVariants()` in `scanner.ts`
3. Add test fixture using that variant system
4. Add tests to verify detection

## Testing Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] New features have tests
- [ ] README updated if public API changed
- [ ] SKILL.md updated if MCP tools changed

## Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes with tests
4. **Run** `npm run ci` to verify everything works
5. **Commit** with a clear message describing the change
6. **Push** to your fork
7. **Open** a pull request with:
   - Clear description of the change
   - Link to any related issues
   - Screenshots/examples if UI or output changed

### PR Title Format

```
feat: add support for Panda CSS variants
fix: handle re-exported components correctly
docs: clarify MCP setup instructions
test: add coverage for forwardRef detection
```

### PR Review

- Maintainers will review within 3-5 days
- Address feedback in new commits (don't force push)
- Once approved, we'll squash and merge

## Reporting Issues

### Bug Reports

Include:
- Version of react-component-atlas
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Sample component code if relevant

### Feature Requests

Describe:
- The problem you're trying to solve
- Why existing features don't work
- Proposed solution (optional)
- Examples from other tools (optional)

## Areas We Need Help

Current priorities for v0.2+:

- **Embeddings-based duplicate detection** — Semantic similarity
- **More variant systems** — tailwind-variants, vanilla-extract variants
- **Deep re-export handling** — Barrel file resolution
- **Watch mode** — File watcher for incremental updates
- **Performance** — Caching strategies for large repos
- **Documentation** — More examples, video tutorials

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree your contributions will be licensed under the MIT License.

## Questions?

Open a discussion or issue. We're happy to help!

---

**Thank you for contributing!** Every PR, issue, and suggestion helps make component-atlas better for everyone.
