# @mission-platform/d3

`@mission-platform/d3` provides framework-neutral integration between D3 and the Mission Platform write-once component system.

## Architecture

This package bridges imperative D3 selection-based rendering with declarative reactive UI trees:

- **Neutral Implementation**: Built on top of `@mission-platform/forge` hooks (`useRef`, `useEffect`).
- **Dual-Framework Target**: Transpiled by `@mission-platform/vite-plugin-forge` into native React (`./react`) and Vue 3 (`./vue`) composables.
- **Selective Dependency**: Imports `d3-selection` directly to keep client bundle sizes minimal.

## Key APIs

### `useD3`

```ts
function useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>;
```

Attaches to a DOM/SVG element ref and executes the `draw` function passing a D3 selection (`D3Selection<E>`) when mounted and when dependencies change. `draw` can optionally return a teardown cleanup function.

### Margin Utilities

#### `resolveMargin(input?: MarginInput): Margin`

Normalizes partial or missing margin objects into full `{ top, right, bottom, left }` pixel values.

#### `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`

Computes `innerWidth`, `innerHeight`, and resolved `margin` for SVG viewbox calculations.

```ts
interface InnerDimensions {
  innerWidth: number;
  innerHeight: number;
  margin: Margin;
}
```
