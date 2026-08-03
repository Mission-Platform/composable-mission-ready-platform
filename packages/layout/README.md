# `@mission-platform/layouts`

Mission Platform application layout components authored with `@mission-platform/forge` and exported for both Vue 3 and React.

---

## Overview

The `@mission-platform/layouts` package provides framework-neutral layout components designed for application structure, containers, and vertical responsive layouts.

Component entry points:

- **`@mission-platform/layouts`**: Framework-neutral JSX components (`BaseApplicationLayout`, `BaseContainer`, `BaseVerticalLayout`).
- **`@mission-platform/layouts/vue`**: Pre-wrapped Vue 3 components.
- **`@mission-platform/layouts/react`**: Pre-wrapped React components.
- **`@mission-platform/layouts/storyblok/vue`**: Storyblok CMS integration for Vue 3.
- **`@mission-platform/layouts/storyblok/react`**: Storyblok CMS integration for React.
- **`@mission-platform/layouts/styles`**: Accessibility and layout SCSS styles.

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
  import { BaseApplicationLayout, BaseContainer, BaseVerticalLayout } from '@mission-platform/layouts/vue';
</script>

<template>
  <BaseApplicationLayout app-title="Mission Platform App">
    <BaseContainer max-width="lg">
      <BaseVerticalLayout gap="md">
        <h1>Welcome</h1>
        <p>Main content area</p>
      </BaseVerticalLayout>
    </BaseContainer>
  </BaseApplicationLayout>
</template>
```

### React Usage

```tsx
import { BaseApplicationLayout, BaseContainer, BaseVerticalLayout } from '@mission-platform/layouts/react';

export function App() {
  return (
    <BaseApplicationLayout appTitle="Mission Platform App">
      <BaseContainer maxWidth="lg">
        <BaseVerticalLayout gap="md">
          <h1>Welcome</h1>
          <p>Main content area</p>
        </BaseVerticalLayout>
      </BaseContainer>
    </BaseApplicationLayout>
  );
}
```

---

## Exported Components & API

### `BaseApplicationLayout`

An application shell layout with title, navigation slots, header, and main content section.

- **Props**: `appTitle`, `status`, `statusLevel`, `homeUrl`, `logoUrl`, etc.

### `BaseContainer`

A responsive layout container restricting max-width and providing consistent padding.

- **Props**: `maxWidth` (`'sm'` | `'md'` | `'lg'` | `'xl'` | `'full'`), `gutter`, `variant`, `size`.

### `BaseVerticalLayout`

A flexbox column layout with responsive gap options.

- **Props**: `gap`, `align`, `justify`, `size`.
