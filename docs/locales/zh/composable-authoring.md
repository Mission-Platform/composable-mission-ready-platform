# Composable Authoring

Composables are the primary way to encapsulate and reuse reactive logic within the Mission Platform. To ensure these
units of logic are portable across all supported UI frameworks, they are authored as **write-once** modules using the
framework-neutral hooks provided by `@mission-platform/forge-jsx`.

## Directory Layout

Each composable MUST reside in its own named subdirectory within `src/composables/`, accompanied by a co-located test
file and a local barrel.

```text
src/composables/
├── use-focus-trap/
│   ├── use-focus-trap.ts        # Composable logic
│   ├── use-focus-trap.spec.ts   # Required unit tests
│   └── index.ts                 # Local barrel
└── index.ts                     # Package-level re-exports
```

## Authoring Rules

1. **Use Forge Hooks**: Only import reactive primitives (e.g., `useState`, `useEffect`, `useMemo`, `useRef`) from
   `@mission-platform/forge-jsx`. Never import directly from `vue` or `react`.
2. **Naming Convention**: Composable names must use kebab-case and be prefixed with `use-` (e.g., `use-media-query`).
3. **SSR Safety**: Ensure logic is safe for Server-Side Rendering. Guard any access to browser-only APIs like `window`,
   `document`, or `localStorage`.
4. **No UI Components**: Composables should focus on logic. Do not return or manipulate UI components directly; instead,
   return state, refs, or callbacks.
5. **Mandatory Testing**: Every composable must have a co-located `.spec.ts` file using Vitest.

## Basic Example

Here is a typical write-once composable that manages an event listener.

```ts
import { type MpRef, useEffect } from '@mission-platform/forge-jsx';

export function useEventListener(
  target: MpRef<EventTarget | null>,
  type: string,
  listener: EventListener,
): void {
  useEffect(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    element.addEventListener(type, listener);
    
    // Clean up on unmount or dependency change
    return () => {
      element.removeEventListener(type, listener);
    };
  }, [target, type, listener]);
}
```

## Scaffolding

The fastest way to create a new composable is via the Mission Platform Developer MCP tool:

```bash
# Example: Creating a new 'use-click-outside' composable in the 'observers' package
scaffold_composable(name="use-click-outside", package="observers", apply=true)
```

## Related Guides

- [Package Development](package-development.md)
- [Atomic Component Design](atomic-component-design.md)
- [Store Authoring](store-authoring.md)
- [Util Authoring](util-authoring.md)
