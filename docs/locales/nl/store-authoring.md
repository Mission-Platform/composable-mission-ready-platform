# Store Authoring

Stores are used to manage shared, cross-component state within a package. Unlike application-level stores (like Pinia or
Redux), package stores in the Mission Platform are designed to be **framework-neutral observable modules**. This allows
write-once components to consume them via Forge hooks regardless of the host framework.

## Directory Layout

Each store MUST reside in its own named subdirectory within `src/stores/`, accompanied by a co-located test file and a
local barrel.

```text
src/stores/
├── theme-store/
│   ├── theme-store.ts        # Store logic (observable)
│   ├── theme-store.spec.ts   # Required unit tests
│   └── index.ts              # Local barrel
└── index.ts                  # Package-level re-exports
```

## The Observable Pattern

Package stores avoid framework-specific dependencies. Instead, they follow a simple observable pattern:

1. **Private State**: Keep state within the module scope (plain TypeScript values).
2. **Snapshot Access**: Provide a `getSnapshot()` function to retrieve the current state.
3. **Subscription**: Provide a `subscribe(listener)` function that adds a callback to a list and returns an unsubscribe
   function.
4. **Mutators**: Provide functions to update the state, which MUST notify all listeners after the update.

## Authoring Rules

1. **Framework Agnostic**: Do not import from `vue`, `react`, or `@mission-platform/forge-jsx` hooks inside the store module
   itself.
2. **Explicit Types**: Always define and export an interface for the store's state.
3. **SSR Safety**: Guard access to browser APIs (e.g., `localStorage`) so the store can be initialized in a Node.js
   environment.
4. **Mandatory Testing**: Every store must have a co-located `.spec.ts` file.

## Example Store

```ts
export interface ThemeState {
  theme: 'light' | 'dark' | 'auto';
}

let state: ThemeState = { theme: 'auto' };
const listeners = new Set<() => void>();

export function getThemeSnapshot(): ThemeState {
  return state;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: ThemeState['theme']): void {
  state = { ...state, theme };
  listeners.forEach((listener) => listener());
}
```

## Consuming Stores in Components

To use a store within a write-once component, bridge it using `useState` and `useEffect` from `@mission-platform/forge-jsx`:

```tsx
const [snapshot, setSnapshot] = useState(getThemeSnapshot());

useEffect(() => {
  return subscribeTheme(() => setSnapshot(getThemeSnapshot()));
}, []);
```

## Scaffolding

Use the Mission Platform Developer MCP tool to generate a new store skeleton:

```bash
# Example: Creating a new 'auth-store' in the 'components' package
scaffold_store(name="auth-store", package="components", apply=true)
```

## Related Guides

- [Package Development](package-development.md)
- [Atomic Component Design](atomic-component-design.md)
- [Composable Authoring](composable-authoring.md)
- [Util Authoring](util-authoring.md)
