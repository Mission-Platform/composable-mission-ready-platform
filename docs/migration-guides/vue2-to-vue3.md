# Vue 2 to Vue 3 Migration Guide

This guide provides step-by-step instructions for migrating the Mission Platform from Vue 2 to Vue 3.

## Migration Checklist

### 1. Verify Dependency Direction
Before starting the migration, ensure all packages only import from `configs/`:

```bash
# Run ESLint to check for invalid imports
pnpm run lint -- --fix

# Look for errors like:
# 'import AppLayout from '@/apps/main/Layout.vue' # BLOCKED BY LINT'
```

**Action Item**: Add this verification step to your migration checklist:
- ✅ Verify all packages only import from `configs/` directory
- ✅ Ensure no package imports from `apps/` or other packages directly

### 2. Update Build Configuration
Update Vite and TypeScript configurations for Vue 3 compatibility:

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      templateOptions: {
        compilerOptions: {
          // Enable Vue 3 specific features
          isCustomElement: (tag) => tag.startsWith('custom-'),
        },
      },
    }),
  ],
})
```

### 3. Update Component Syntax
Convert Single File Components from Vue 2 to Vue 3 syntax:

**Vue 2:**
```vue
<template>
  <div>
    <h1>{{ message }}</h1>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello Vue 2'
    }
  }
}
</script>
```

**Vue 3:**
```vue
<template>
  <div>
    <h1>{{ message }}</h1>
  </div>
</template>

<script setup lang="ts">
const message = 'Hello Vue 3'
</script>
```

### 4. Update Utility Functions
Refactor utility functions to use Composition API patterns:

**Vue 2:**
```ts
export function useCounter() {
  return {
    count: 0,
    increment() { this.count++ }
  }
}
```

**Vue 3:**
```ts
import { ref } from 'vue'

export function useCounter() {
  const count = ref(0)
  const increment = () => { count.value++ }
  return { count, increment }
}
```

### 5. Update Testing Configuration
Update Vitest configuration for Vue 3 testing:

```js
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
  },
})
```

### 6. Verify All Packages
After migration, verify all packages maintain proper dependency direction:

```bash
# Run comprehensive checks
pnpm exec turbo run lint
pnpm exec turbo run test

# Check for any lint warnings or errors
pnpm exec turbo run lint -- --max-warnings=0
```