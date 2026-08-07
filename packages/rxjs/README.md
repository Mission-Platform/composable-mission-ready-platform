# `@mission-platform/rxjs`

Framework-neutral RxJS integration for Mission Platform apps. Write-once composables (`useObservable`,
`useSubscription`, `useSubscribe`) authored against `@mission-platform/forge` hooks and shipped for React,
Vue, and framework-neutral environments — all behind the single bare `@mission-platform/rxjs` specifier.

---

## Overview

`@mission-platform/rxjs` bridges RxJS streams (`Observable`) into component reactivity and lifecycle management without
framework lock-in.

Exports:

- **`@mission-platform/rxjs`**: the only entry point, exposing `useObservable`, `useSubscription`, and
  `useSubscribe`. The active `mp:<framework>` export condition decides whether you get the pre-wrapped Vue 3
  composables, the React hooks, or the framework-neutral versions (when no condition is set).

The framework is chosen **once** — `resolve.conditions` via `defineFrameworkAppConfig` /
`frameworkResolveConditions` from `@mission-platform/vite-config`, and `customConditions` via the
`@mission-platform/typescript-config/framework-<name>` presets — so the imports below are identical for
every target.

---

## Installation

```bash
pnpm add @mission-platform/rxjs rxjs
```

---

## Usage Examples

### React Usage (`mp:react`)

```tsx
import { useObservable, useSubscribe } from '@mission-platform/rxjs';
import { timer } from 'rxjs';

const seconds$ = timer(0, 1000);

export function TimerComponent() {
  const seconds = useObservable(seconds$, 0);

  useSubscribe(seconds$, (val) => {
    console.log('Tick:', val);
  });

  return <div>Elapsed: {seconds}s</div>;
}
```

### Vue 3 Usage (`mp:vue`)

```vue
<script setup lang="ts">
  import { useObservable, useSubscribe } from '@mission-platform/rxjs';
  import { timer } from 'rxjs';

  const seconds$ = timer(0, 1000);
  const seconds = useObservable(seconds$, 0);

  useSubscribe(seconds$, (val) => {
    console.log('Tick:', val);
  });
</script>

<template>
  <div>Elapsed: {{ seconds }}s</div>
</template>
```

---

## API Reference

### `useObservable(source, initialValue?)`

Subscribes to an RxJS `Observable` and exposes its latest value as reactive state. Unsubscribes automatically when the
component unmounts or `source` changes.

- **`source`**: `Observable<T>`
- **`initialValue`**: Optional initial value of type `T` before the first emission.
- **Returns**: `T | undefined` (or `T` if `initialValue` is provided).

### `useSubscription(subscribe, dependencies?)`

Ties the lifetime of an RxJS subscription to the component lifecycle.

- **`subscribe`**: Function returning an object with an `unsubscribe()` method.
- **`dependencies`**: Optional dependency array triggering re-subscription.

### `useSubscribe(source, observerOrNext?, dependencies?)`

Convenience wrapper to subscribe directly to `source` with a next callback or observer.
