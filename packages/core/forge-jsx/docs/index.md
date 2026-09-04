# @mission-platform/forge-jsx

A tiny, dependency-free framework-neutral JSX runtime for Mission Platform.
Components are authored once in JSX and rendered through the separate
`@mission-platform/forge-adapters` package.

## How it works

```
author .tsx ──(classic jsx factory `h`)──▶ MpElement tree ──▶ framework adapter ──▶ target framework
```

1. Components are written in JSX compiled by the **classic** JSX transform (`jsxFactory: 'h'`,
   `jsxFragmentFactory: 'Fragment'`).
2. `h(...)` builds a framework-neutral, serialisable `MpElement` tree instead of a React/Vue element.
3. A framework adapter walks that tree and maps every node onto the target
   framework's native rendering primitives.

## Features

- **Framework-Neutral JSX Runtime**: A tiny, dependency-free runtime that builds serializable `MpElement` trees
- **Hooks Support**: Framework-neutral React-style hooks (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`)
  that compile to their framework equivalents
- **No Build-Time Codegen**: Unlike Mitosis or similar tools, this approach uses runtime adapters instead of build-time
  transformation
- **TypeScript First**: Full TypeScript support with proper type inference

## Installation

```bash
npm install @mission-platform/forge-jsx
# or
yarn add @mission-platform/forge-jsx
# or
pnpm add @mission-platform/forge-jsx
```

## Basic Usage

### 1. Write a framework-neutral component

```tsx
// MyComponent.tsx
import { h, Fragment } from '@mission-platform/forge-jsx';
import { useState } from '@mission-platform/forge-jsx';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### 2. Use it in Vue 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge-adapters/vue';
  import MyComponent from './MyComponent.tsx';

  const MyVueComponent = toVueComponent(MyComponent);
</script>

<template>
  <MyVueComponent name="World" />
</template>
```

### 3. Use it in React

```tsx
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import MyComponent from './MyComponent.tsx';

const MyReactComponent = toReactComponent(MyComponent);

function App() {
  return <MyReactComponent name="World" />;
}
```

## API Reference

### Core Functions

#### `h(type, props?, ...children)`

The framework-neutral JSX factory function.

**Parameters:**

- `type`: React element type or string tag name
- `props`: Object of props/attributes
- `children`: Child elements

**Returns:** `MpElement` - A framework-neutral element tree

#### `Fragment(props, ...children)`

Creates a fragment (no wrapper element).

### Hooks

#### `useState(initialValue)`

Framework-neutral state hook.

**Parameters:**

- `initialValue`: Initial state value

**Returns:** `[state, setState]` - State value and setter function

#### `useRef(initialValue)`

Creates a mutable ref object.

**Parameters:**

- `initialValue` (optional): Initial ref value

**Returns:** `ref` - Mutable ref object with `.current` property

#### `useEffect(effect, dependencies?)`

Framework-neutral side effect hook.

**Parameters:**

- `effect`: Function to run on mount/update/unmount
- `dependencies` (optional): Dependency array for memoization

#### `useMemo(value, dependencies)`

Memoizes a computed value.

**Parameters:**

- `value`: Value to memoize
- `dependencies`: Dependency array

**Returns:** Memoized value

#### `useCallback(fn, dependencies)`

Memoizes a function.

**Parameters:**

- `fn`: Function to memoize
- `dependencies`: Dependency array

**Returns:** Memoized function

## TypeScript Support

The package includes full TypeScript declarations. You can use JSX with proper type checking:

```tsx
import { h } from '@mission-platform/forge-jsx';

type Props = {
  title: string;
  count?: number;
};

function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      {title}: {count}
    </div>
  );
}
```

## Advanced Usage

### Using with Vite

Configure your `vite.config.ts` to use the classic JSX transform:

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  optimizeDeps: {
    include: ['@mission-platform/forge-jsx'],
  },
});
```

### Global JSX Configuration

For TypeScript projects, you can configure global JSX settings:

```ts
// jsx-globals.d.ts
import '@mission-platform/forge-jsx/jsx-globals';
```

This configures the global `JSX` namespace to use `MpElement`.

## Migration from Other Frameworks

If you're migrating from React or Vue components, the conversion is straightforward:

### From React

```tsx
// Before (React)
function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}

// After (Framework-neutral)
import { h, Fragment, useState } from '@mission-platform/forge-jsx';

export function Button({ children }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{children}</button>;
}
```

### From Vue

```vue
<!-- Before (Vue) -->
<script setup>
  import { ref } from 'vue';
  const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>

// After (Framework-neutral) export function Button() { const [count, setCount] = useState(0) return (
<button onClick="{()" =""> setCount(count + 1)}>
      Count: {count}
    </button>
) }
```

## Performance Considerations

- The framework-neutral layer adds minimal overhead (just a tree walk at render time)
- Hooks are compiled to native framework equivalents for optimal performance
- No runtime parsing or code generation is performed
- Memory footprint is comparable to writing separate React and Vue components

## License

BSD-4-Clause
