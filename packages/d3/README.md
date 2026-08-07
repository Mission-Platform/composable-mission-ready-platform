# `@mission-platform/d3`

Framework-neutral D3 integration for Mission Platform. It provides a write-once `useD3` composable authored against
`@mission-platform/forge` hooks and compiled to native React, Vue 3, Solid and Web Components builds — all reachable
through the single bare `@mission-platform/d3` specifier — along with pure margin-convention layout utilities.

## Features

- **Write Once `useD3` Hook**: Binds D3 selection rendering to an element ref with cleanup support, working natively in
  both React and Vue.
- **Pure Margin Utilities**: `innerDimensions` and `resolveMargin` helpers to calculate SVG viewbox dimensions using
  standard D3 margin conventions.
- **Lean Dependency**: Depends directly on `d3-selection` for runtime element selection without pulling in the entire D3
  bundle.

## Installation

```bash
pnpm add @mission-platform/d3
```

## Usage

The framework is selected **once** via the `mp:<framework>` export condition — `resolve.conditions` (see
`defineFrameworkAppConfig` / `frameworkResolveConditions` from `@mission-platform/vite-config`) and
`customConditions` (via the `@mission-platform/typescript-config/framework-<name>` presets) — so both
examples below use the identical bare import.

### Vue 3 (`mp:vue`)

```vue
<script setup lang="ts">
  import { useD3, resolveMargin, innerDimensions } from '@mission-platform/d3';
  import { ref } from 'vue';

  const data = ref([10, 20, 30, 40, 50]);
  const margin = resolveMargin({ top: 20, right: 20, bottom: 30, left: 40 });
  const { innerWidth, innerHeight } = innerDimensions(500, 300, margin);

  const svgRef = useD3<SVGSVGElement>(
    (selection) => {
      selection.selectAll('*').remove();

      const g = selection
        .attr('width', 500)
        .attr('height', 300)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      g.selectAll('rect')
        .data(data.value)
        .join('rect')
        .attr('x', (_, i) => i * 40)
        .attr('y', (d) => innerHeight - d * 5)
        .attr('width', 30)
        .attr('height', (d) => d * 5)
        .attr('fill', '#3b82f6');
    },
    [data],
  );
</script>

<template>
  <svg :ref="svgRef" />
</template>
```

### React (`mp:react`)

```tsx
import { useD3, resolveMargin, innerDimensions } from '@mission-platform/d3';

export function BarChart({ data }: { data: number[] }) {
  const margin = resolveMargin({ top: 20, right: 20, bottom: 30, left: 40 });
  const { innerHeight } = innerDimensions(500, 300, margin);

  const svgRef = useD3<SVGSVGElement>(
    (selection) => {
      selection.selectAll('*').remove();

      const g = selection
        .attr('width', 500)
        .attr('height', 300)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      g.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', (_, i) => i * 40)
        .attr('y', (d) => innerHeight - d * 5)
        .attr('width', 30)
        .attr('height', (d) => d * 5)
        .attr('fill', '#3b82f6');
    },
    [data],
  );

  return <svg ref={svgRef} />;
}
```

## Exports

- `@mission-platform/d3`: the only entry point. Resolves to the native compiled entry for the active
  `mp:<framework>` condition (`mp:vue`, `mp:react`, `mp:solid`, `mp:web-component`), or to the
  neutral entry when no condition is set.

### API Reference

- `useD3<E extends Element>(draw: D3Draw<E>, dependencies?: MpDependencyList): MpRef<E | null>`
- `resolveMargin(input?: MarginInput): Margin`
- `innerDimensions(outerWidth: number, outerHeight: number, marginInput?: MarginInput): InnerDimensions`
