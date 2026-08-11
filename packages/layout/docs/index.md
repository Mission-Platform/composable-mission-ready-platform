# `@mission-platform/layouts`

Framework-neutral application and pattern layouts for Vue 3 and React, authored with the Forge JSX dialect and styled
with Mission Platform design tokens.

## Overview

The `@mission-platform/layouts` package contains application shells, containers, vertical layouts, and four reusable
responsive pattern templates. Its components are exported through the existing framework-conditioned package build, so
the same source works with Vue 3, React, Solid, Svelte, and Web Components.

## Features

- **Application shell**: `ForgeApplicationLayout`, `ForgeContainer`, and `ForgeVerticalLayout`
- **Bento composition**: A dominant hero with feature and supporting regions
- **Regular grid**: Ordered named cells for metric and status-card collections
- **F-pattern composition**: Documentation-style header, intro, article, secondary, and footer regions
- **Z-pattern composition**: Alternating top, middle, and bottom content regions
- **CSS-only responsiveness**: Mobile-first reflow without `window`, `matchMedia`, or client state
- **Design token integration**: Gaps, padding, and margins use Mission Platform spacing tokens

## Installation

```bash
pnpm add @mission-platform/layouts
```

## Usage

### Vue 3

```vue
<script setup lang="ts">
  import { ForgeBentoLayout, ForgeFPatternLayout, ForgeGridLayout } from '@mission-platform/layouts';
</script>

<template>
  <ForgeBentoLayout gap="lg">
    <template #hero><h1>Mission Platform</h1></template>
    <template #feature><p>Composable building blocks</p></template>
    <template #supporting><a href="/docs">Read the docs</a></template>
  </ForgeBentoLayout>

  <ForgeFPatternLayout>
    <template #header><nav>Documentation navigation</nav></template>
    <template #primary><article>Guide content</article></template>
    <template #secondary><aside>On this page</aside></template>
  </ForgeFPatternLayout>

  <ForgeGridLayout
    :rows="2"
    :columns="2"
  >
    <template #cell1><article>Availability</article></template>
    <template #cell2><article>Latency</article></template>
  </ForgeGridLayout>
</template>
```

### React

```tsx
import { ForgeBentoLayout, ForgeZPatternLayout } from '@mission-platform/layouts';

export function LandingPage() {
  return (
    <>
      <ForgeBentoLayout
        hero={<h1>Mission Platform</h1>}
        feature={<p>Composable building blocks</p>}
        supporting={<a href="/docs">Read the docs</a>}
      />
      <ForgeZPatternLayout
        topStart={<h2>Build once</h2>}
        topEnd={
          <img
            src="hero.png"
            alt=""
          />
        }
        middle={<p>Use the same layout from Vue or React.</p>}
        bottomStart={<a href="/docs">Documentation</a>}
        bottomEnd={<button type="button">Get started</button>}
      />
    </>
  );
}
```

## API Reference

### Shared controls

All four pattern templates accept:

- `tag`: `div`, `section`, `article`, `main`, or `aside`
- `gap`, `margin`, and `padding`: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, or `2xl`
- `breakpoint`: `xs`, `sm`, `md`, `lg`, or `xl`

The components start as one-column or stacked layouts. At the selected breakpoint they apply their pattern-specific
grid areas. Region wrappers have predictable BEM-style classes and are emitted only when their named slot is present.

### Region contracts

| Component             | Named regions                                              | Composition source                                   |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | Website marketing hero and feature sections          |
| `ForgeGridLayout`     | `cell1` through `cell12`                                   | Service-monitor dashboard cards and status summaries |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | Docs navbar/context, article, sidebar, and footer    |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Alternating landing-page content and actions         |

`ForgeGridLayout` accepts `rows` and `columns`, clamps both to one or greater, limits the renderable area to 12 named
cells, and uses a single-column fallback below its breakpoint. Named cells always render in source order.

## Product composition guidance

The templates extract structure, not application behavior. Website package cards and FAQ content, docs navigation and
routing, and service-monitor polling, forms, and incident state remain owned by their applications. Those applications
can pass their existing content into the named regions without introducing imports from `apps/` into `packages/layout`.

For accessibility, keep the supplied content in semantic reading order and treat CSS grid areas as visual placement only.
Long content is protected by `min-width: 0` and `overflow-wrap: anywhere`; SSR does not require `window` or
`matchMedia`.

## License

BSD-4-Clause
