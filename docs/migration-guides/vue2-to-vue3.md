# Vue 2 to Vue 3 Migration Guide

This guide describes how to migrate existing Vue 2 codebases to Vue 3 within the Mission Platform monorepo.

## Overview

The Mission Platform uses Vue 3 with the Composition API and `<script setup>` syntax. Migration involves moving away from the Options API and updating component lifecycle and reactivity patterns.

## Prerequisites

Before migrating, ensure your package follows the platform's dependency rules:
- No imports from `apps/`.
- All shared logic should reside in `packages/`.
- Configuration should come from `configs/`.

## Step 1: Update Build Configuration

Ensure your `package.json` and `vite.config.ts` are targeting Vue 3.

```ts
// vite.config.ts
import { defineAppConfig } from '@mission-platform/vite-config';
import { defineConfig } from 'vite';

export default defineConfig(defineAppConfig({
  // Vue 3 plugin is already included in defineAppConfig
}));
```

## Step 2: Convert Options API to Composition API

Replace the Vue 2 Options API (`data`, `methods`, `computed`) with the Vue 3 Composition API.

### Data to Refs
In Vue 2, state was defined in the `data()` function. In Vue 3, use `ref()` or `reactive()`.

**Vue 2:**
```js
export default {
  data() {
    return {
      count: 0
    }
  }
}
```

**Vue 3:**
```ts
import { ref } from 'vue';

const count = ref(0);
```

### Methods to Functions
Methods become plain functions in the `<script setup>` block.

**Vue 2:**
```js
methods: {
  increment() {
    this.count++;
  }
}
```

**Vue 3:**
```ts
const increment = () => {
  count.value++;
};
```

## Step 3: Update Lifecycle Hooks

Lifecycle hooks have been renamed and must be imported.

| Vue 2 | Vue 3 |
| :--- | :--- |
| `beforeCreate` / `created` | Use `setup()` / `<script setup>` directly |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

Example:
```ts
import { onMounted } from 'vue';

onMounted(() => {
  console.log('Component is mounted');
});
```

## Step 4: Adopt `<script setup>`

All new and migrated components in the Mission Platform should use the `<script setup>` syntax with TypeScript.

```vue
<template>
  <button @click="increment">{{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
const increment = () => count.value++;
</script>
```

## Step 5: Handle Breaking Changes

### V-model
In Vue 3, the default prop name for `v-model` is `modelValue` and the event is `update:modelValue`.

### Ref access
`this.$refs` is no longer used. Define a ref with the same name as the `ref` attribute on the element.

```vue
<template>
  <div ref="root"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const root = ref<HTMLElement | null>(null);

onMounted(() => {
  console.log(root.value);
});
</script>
```

## Step 6: Verification

Run the following commands to ensure the migration is successful and adheres to platform standards:

```bash
# Type-check the package
pnpm exec turbo run typecheck --filter <your-package>

# Run linting
pnpm exec turbo run lint --filter <your-package>

# Run tests
pnpm exec turbo run test --filter <your-package>
```