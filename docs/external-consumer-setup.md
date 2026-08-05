# External Consumer Setup

This guide explains how to consume Mission Platform packages in projects located outside of the main monorepo. It focuses on using framework-specific builds and managing design tokens.

## Framework Selection via Conditions

Mission Platform components are authored once using `@mission-platform/forge` and distributed as multiple framework-specific bundles (Vue 3, React, Solid, Svelte, etc.) within a single package.

To select the correct bundle, you must configure your build tool and TypeScript to use **Custom Export Conditions**.

### Supported Framework Conditions

| Framework | Export Condition |
| :--- | :--- |
| **Vue 3** | `mp:vue` |
| **React** | `mp:react` |
| **Solid** | `mp:solid` |
| **Svelte** | `mp:svelte` |
| **Web Components** | `mp:web-component` |

## Project Configuration

### 1. Vite Configuration

If you are using Vite, you can use the helper functions from `@mission-platform/vite-config` to automatically set the correct resolve conditions.

```ts
import { defineConfig } from 'vite';
import { frameworkResolveConditions } from '@mission-platform/vite-config';

export default defineConfig({
  resolve: {
    // This places 'mp:vue' at the top of the condition list
    conditions: frameworkResolveConditions('mp:vue'),
  },
});
```

### 2. TypeScript Configuration

To ensure the TypeScript Language Service (LSP) resolves types for the correct framework, you should extend a framework preset from `@mission-platform/typescript-config`.

```json
{
  "extends": "@mission-platform/typescript-config/framework-vue",
  "compilerOptions": {
    "customConditions": ["mp:vue"]
  }
}
```

## Package Installation

Install the required packages from your registry:

```bash
pnpm add @mission-platform/components @mission-platform/tokens
```

### Peer Dependencies

Most Mission Platform packages externalize their runtime dependencies. Ensure you have the corresponding framework and shared libraries installed in your project:

```bash
# Example for a Vue 3 project
pnpm add vue vue-router @mission-platform/i18n
```

## Component Usage

With the conditions correctly configured, you can import components from the root of the package. The build tool will automatically select the bundle matching your `mp:*` condition.

```vue
<script setup lang="ts">
import { BaseButton } from '@mission-platform/components';
</script>

<template>
  <BaseButton variant="primary">Click Me</BaseButton>
</template>
```

## Design Token Customization

Mission Platform uses CSS Custom Properties (variables) for design tokens. You can override these tokens globally in your application's root stylesheet.

```css
/* App.css */
:root {
  /* Override the brand primary color */
  --mp-color-brand-primary: #007bff;
  
  /* Override a spacing token */
  --mp-spacing-md: 1.5rem;
}
```

All Mission Platform components consume these variables, so changes at the `:root` level will propagate throughout the entire UI.
