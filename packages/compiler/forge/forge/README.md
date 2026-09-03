# `@mission-platform/forge`

A tiny, framework-neutral JSX runtime and Vue 3 / React adapters that allow components to be authored once in JSX and
rendered seamlessly on either framework without build-time code generation.

---

## Overview

`@mission-platform/forge` provides framework-agnostic JSX runtime primitives (`h`, `Fragment`, hooks, context, slots,
transitions, portals) along with runtime adapters for React and Vue 3.

```
Author .tsx (classic jsx `h`) ──▶ MpElement tree ──┬──▶ toReactComponent ──▶ React Component
                                                    └──▶ toVueComponent  ──▶ Vue 3 Component
```

---

## Package Exports

The package provides the following entry points:

- **`@mission-platform/forge`**: Main entry point exporting the JSX factory (`h`, `Fragment`), component utilities, and
  framework-neutral hooks (`useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, `useId`).
- **`@mission-platform/forge/runtime`**: Low-level JSX runtime primitives, element definitions, context, and slot
  utilities.
- **`@mission-platform/forge/vue`**: Vue 3 adapter (`toVueComponent`, `renderToVue`).
- **`@mission-platform/forge/react`**: React adapter (`toReactComponent`, `renderToReact`).
- **`@mission-platform/forge/jsx-globals`**: Global TypeScript JSX ambient declarations.
- **`@mission-platform/forge/web-components`**: Native custom-element runtime used by
  generated Web Components targets, including shadow-root policies and capability-gated
  `ElementInternals` support.

---

## Installation

```bash
pnpm add @mission-platform/forge
```

_Note: `vue` and `react`/`react-dom` are optional peer dependencies depending on which adapter you use._

---

## Usage

### 1. Write a framework-neutral component

```tsx
// MyComponent.tsx
import { h, Fragment, useState } from '@mission-platform/forge';

export interface MyComponentProps {
  name: string;
}

export function MyComponent({ name }: MyComponentProps) {
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

### 2. Render in Vue 3

```vue
<script setup lang="ts">
  import { toVueComponent } from '@mission-platform/forge/vue';
  import { MyComponent } from './MyComponent';

  const VueMyComponent = toVueComponent(MyComponent);
</script>

<template>
  <VueMyComponent name="World" />
</template>
```

### 3. Render in React

```tsx
import { toReactComponent } from '@mission-platform/forge/react';
import { MyComponent } from './MyComponent';

const ReactMyComponent = toReactComponent(MyComponent);

export function App() {
  return <ReactMyComponent name="World" />;
}
```

---

## API Summary

### Core Primitives

- **`h(type, properties, ...children)`**: Framework-neutral JSX element factory.
- **`Fragment`**: JSX fragment marker.
- **`classNames(...values)`**: Idempotent utility for merging conditional class names.
- **`Slot` / `hasSlot`**: Neutral slot rendering and capability check.
- **`Teleport` / `Transition` / `TransitionGroup` / `Dynamic`**: Neutral markers for dynamic structure and portal
  rendering.
- **`createContext` / `useContext`**: Framework-neutral context system.

### Hooks

- **`useState(initialState)`**
- **`useRef(initialValue)`**
- **`useEffect(effect, deps)`**
- **`useMemo(factory, deps)`**
- **`useCallback(callback, deps)`**
- **`useId()`**

### Adapters

- **`toVueComponent(component)`**: Wraps a neutral JSX component into a native Vue 3 component.
- **`renderToVue(element)`**: Renders a neutral `MpElement` tree to a Vue `VNode`.
- **`toReactComponent(component)`**: Wraps a neutral JSX component into a native React component.
- **`renderToReact(element)`**: Renders a neutral `MpElement` tree to a React `ReactElement`.

### Generated Web Components

The Web Components output plugin chooses a customized built-in only for a
single static root in its conservative compatibility table: `div`, `span`,
`p`, and `h1`–`h6`. Those classes extend the matching native element and are
registered with an `extends` option; generated child references use the native
tag plus `is`. Missing, dynamic, fragment, component, ambiguous, invalid, or
unsupported roots fall back to autonomous custom elements and retain a stable
fallback reason in the lowered plan for diagnostics.

Generated elements use an open shadow root unless a component policy requests
another mode. Optional shadow fields (`delegatesFocus`, `serializable`,
`clonable`, and `slotAssignment`) are capability-checked at runtime, so older
engines retain the supported portion of the policy. `ElementInternals` is
attached only when available; explicit ARIA defaults do not overwrite author
attributes, and form association/value/validity callbacks are emitted only for
components that opt into form metadata.
