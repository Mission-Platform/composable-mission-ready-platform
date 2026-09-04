# Util Authoring

Utilities (utils) are pure, framework-agnostic helper functions. They should be free of UI framework imports and, unless
explicitly required and documented, free of DOM APIs. This ensures they can be used in any context, including
server-side logic and workers.

## Directory Layout

Each utility SHOULD reside in its own named subdirectory within `src/utils/`, accompanied by a co-located test file and
a local barrel.

```text
src/utils/
├── format-date/
│   ├── format-date.ts        # Pure logic
│   ├── format-date.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## Authoring Rules

1. **Purity**: Prefer pure functions that do not have side effects. Given the same input, they should always return the
   same output.
2. **No UI Hooks**: Never import `vue`, `react`, or `@mission-platform/forge-jsx` hooks in a util. Logic requiring
   reactivity belongs in [Composables](composable-authoring.md).
3. **Explicit Typing**: Provide full TypeScript types for all arguments and return values.
4. **Mandatory Testing**: Every util must have a co-located `.spec.ts` file.
5. **Single Responsibility**: Each util folder should focus on a specific, narrow task.

## Basic Example

```ts
/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

## Scaffolding

Use the Mission Platform Developer MCP tool to generate a new utility skeleton:

```bash
# Example: Creating a new 'string-utils' folder in the 'i18n' package
scaffold_util(name="string-utils", package="i18n", apply=true)
```

## Related Guides

- [Package Development](package-development.md)
- [Atomic Component Design](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Store Authoring](store-authoring.md)
