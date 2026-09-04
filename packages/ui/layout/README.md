# `@mission-platform/layouts`

Mission Platform application layout components authored with `@mission-platform/forge-jsx` and exported for both Vue 3 and
React.

---

## Overview

The `@mission-platform/layouts` package provides framework-neutral layout components designed for application structure,
containers, vertical responsive layouts, and the common marketing, documentation, and dashboard compositions used by
Mission Platform applications.

Component entry points:

- **`@mission-platform/layouts`**: the only component entry point (`ForgeApplicationLayout`, `ForgeContainer`,
  `ForgeVerticalLayout`, `ForgeBentoLayout`, `ForgeGridLayout`, `ForgeFPatternLayout`, and `ForgeZPatternLayout`). It resolves to the pre-wrapped Vue 3, React, Solid, or
  web-component build according to the active `mp:<framework>` export condition, and to the
  framework-neutral JSX components when no condition is set.
- **`@mission-platform/layouts/cms/storyblok/vue`**: Storyblok CMS integration for Vue 3.
- **`@mission-platform/layouts/cms/storyblok/react`**: Storyblok CMS integration for React.
- **`@mission-platform/layouts/styles`**: Accessibility and layout SCSS styles.

The framework is chosen **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — so every component import below is bare.

---

## Installation

```bash
pnpm add @mission-platform/layouts
```

---

## Usage Examples

### Vue 3 Usage

```vue
<script setup lang="ts">
  import {
    ForgeApplicationLayout,
    ForgeBentoLayout,
    ForgeContainer,
    ForgeFPatternLayout,
    ForgeGridLayout,
    ForgeVerticalLayout,
    ForgeZPatternLayout,
  } from '@mission-platform/layouts';
</script>

<template>
  <ForgeApplicationLayout app-title="Mission Platform App">
    <ForgeContainer max-width="lg">
      <ForgeVerticalLayout gap="md">
        <h1>Welcome</h1>
        <p>Main content area</p>
      </ForgeVerticalLayout>
    </ForgeContainer>
  </ForgeApplicationLayout>
</template>
```

Pattern layouts use named slots. The slots are ordinary Vue named slots and React properties, so the same authored
component remains SSR-safe in both frameworks:

```vue
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
```

### React Usage

```tsx
import {
  ForgeApplicationLayout,
  ForgeBentoLayout,
  ForgeContainer,
  ForgeFPatternLayout,
  ForgeGridLayout,
  ForgeVerticalLayout,
  ForgeZPatternLayout,
} from '@mission-platform/layouts';

export function App() {
  return (
    <ForgeApplicationLayout appTitle="Mission Platform App">
      <ForgeContainer maxWidth="lg">
        <ForgeVerticalLayout gap="md">
          <h1>Welcome</h1>
          <p>Main content area</p>
        </ForgeVerticalLayout>
      </ForgeContainer>
    </ForgeApplicationLayout>
  );
}
```

The equivalent React named-slot properties are explicit:

```tsx
<ForgeZPatternLayout
  topStart={<h1>Build once</h1>}
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
```

---

## Exported Components & API

### `ForgeApplicationLayout`

An application shell layout with title, navigation slots, header, and main content section.

- **Props**: `appTitle`, `status`, `statusLevel`, `homeUrl`, `logoUrl`, etc.

### `ForgeContainer`

A responsive layout container restricting max-width and providing consistent padding.

- **Props**: `maxWidth` (`'sm'` | `'md'` | `'lg'` | `'xl'` | `'full'`), `gutter`, `variant`, `size`.

### `ForgeVerticalLayout`

A flexbox column layout with responsive gap options.

- **Props**: `gap`, `align`, `justify`, `size`.

### Pattern layouts

All pattern layouts accept `tag`, `gap`, `margin`, `padding`, and `breakpoint`. Spacing values are Mission Platform
tokens: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, and `2xl`; breakpoints are `xs`, `sm`, `md`, `lg`, and `xl`. Layouts use
mobile-first CSS and never use viewport JavaScript.

| Component             | Named regions                                              | Typical product structure                         |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `ForgeBentoLayout`    | `hero`, `feature`, `supporting`                            | Website hero and feature/supporting content       |
| `ForgeGridLayout`     | `cell1` through `cell12`                                   | Service-monitor metric and status cards           |
| `ForgeFPatternLayout` | `header`, `intro`, `primary`, `secondary`, `footer`        | Docs navbar/context, article, sidebar, and footer |
| `ForgeZPatternLayout` | `topStart`, `topEnd`, `middle`, `bottomStart`, `bottomEnd` | Alternating landing-page content and actions      |

`ForgeGridLayout` additionally accepts numeric `rows` and `columns`. Values below one are clamped to one, at most 12
named cells are rendered, and the grid becomes a single column below `breakpoint`. Optional slots do not create empty
wrappers, so sparse dashboard data remains accessible and does not reserve visual gaps.

The pattern templates intentionally contain structure only. Application-specific data, navigation state, translations,
forms, and monitoring behavior stay in `apps/website`, `apps/docs`, and `apps/service-monitor`; those applications can
place their existing content in the named regions without importing application code into this package.
