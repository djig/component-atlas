# Component Atlas Skill

**For**: Cursor, Claude Code, Codex, Copilot, and other coding agents  
**Purpose**: Use Component Atlas to discover and reuse existing React components instead of creating duplicates

## When to Use This Skill

Use Component Atlas whenever you need to:
- Create a new React component
- Use an existing component but unsure of its props
- Check if a component already exists before building one
- Understand available design system variants

## Prerequisites

The codebase must have a component atlas generated. If `atlas.json` doesn't exist, run:

```bash
component-atlas scan
```

## Instructions

### Before Creating a Component

1. **Search for similar components first**:
   ```
   Use the search_components MCP tool with keywords describing what you need.
   Example: search_components({ query: "button clickable action" })
   ```

2. **Check for duplicates**:
   ```
   Use check_duplicate with your proposed component name and props.
   Example: check_duplicate({
     name: "ActionButton",
     props: [
       { name: "onClick", type: "function", required: true },
       { name: "label", type: "string", required: true }
     ]
   })
   ```

3. **If a match exists (>70% similarity)**:
   - DO NOT create a new component
   - Use the existing component instead
   - Get its full details with `get_component({ name: "ComponentName" })`
   - Check usage examples to see how it's used in the codebase

4. **If no match exists (<70% similarity)**:
   - Proceed with creating the component
   - Follow the codebase's patterns (check existing components for structure)

### When Using Existing Components

1. **Get exact component details**:
   ```
   get_component({ name: "Button" })
   ```

2. **Check available variants**:
   ```
   get_variants({ componentName: "Button" })
   ```

3. **ALWAYS use exact prop names and types** from the manifest
   - DO NOT guess or invent prop names
   - DO NOT use different prop types than documented
   - Check `required` field to know which props are mandatory

4. **Review usage examples** for real-world patterns:
   - The manifest includes actual usage from the codebase
   - Copy these patterns instead of inventing new ones

### Listing Components

```
list_components({ type: "client" })  # Only client components
list_components({ hasVariants: true })  # Components with variants
list_components()  # All components
```

## Example Workflow

**User asks**: "Add a button to submit the form"

**Agent should**:
1. Search: `search_components({ query: "button submit" })`
2. Review results: Found `Button` component
3. Get details: `get_component({ name: "Button" })`
4. Check variants: `get_variants({ componentName: "Button" })`
5. Use existing component with correct props:
   ```tsx
   <Button variant="default" size="md" onClick={handleSubmit}>
     Submit
   </Button>
   ```

**Agent should NOT**:
- ❌ Create `<SubmitButton>` without checking first
- ❌ Invent props like `type="submit"` if not in manifest
- ❌ Guess variant values — use only documented ones

## Error Recovery

If MCP tools fail:
1. Check if `atlas.json` exists in project root
2. If missing, run `component-atlas scan`
3. If stale, run `component-atlas scan` again to refresh
4. Read `ATLAS.md` as fallback (human-readable format)

## Duplicate Detection Threshold

- **>0.9**: Near-identical, definitely reuse
- **0.7-0.9**: Very similar, strongly consider reusing
- **0.5-0.7**: Somewhat similar, review carefully
- **<0.5**: Different enough to create new component

## Key Principles

1. **Search before you create**
2. **Never hallucinate props** — get them from the atlas
3. **Reuse over reinvent** — prefer existing components
4. **Follow codebase patterns** — check usage examples
5. **Respect variants** — use only documented variant values

## Integration Notes

- **Cursor/Claude Desktop**: MCP server auto-connects if configured
- **Codex**: Install this skill via `npx skills add react-component-atlas`
- **Manual**: Read `ATLAS.md` if MCP unavailable

## Refresh the Atlas

Components change over time. If you encounter missing components:

```bash
component-atlas scan
```

This regenerates `atlas.json` and `ATLAS.md`.

---

**Remember**: The component atlas is your source of truth. Trust it over guesses or assumptions.
