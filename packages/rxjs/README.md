# `@mission-platform/rxjs`

Framework-neutral RxJS integration for Mission Platform apps. Write-once composables (`useObservable`, `useSubscription`, `useSubscribe`) authored against `@mission-platform/forge` hooks and shipped for React (`./react`), Vue (`./vue`), and framework-neutral environments.

---

## Overview

`@mission-platform/rxjs` bridges RxJS streams (`Observable`) into component reactivity and lifecycle management without framework lock-in.

Exports & Subpaths:

- **`@mission-platform/rxjs`**: Framework-neutral hooks (`useObservable`, `useSubscription`, `useSubscribe`).
- **`@mission-platform/rxjs/vue`**: Pre-wrapped Vue 3 composables.
- **`@mission-platform/rxjs/react`**: Pre-wrapped React hooks.

---

## Installation

```bash
pnpm add @mission-platform/rxjs rxjs
```

---

## Usage Examples

### React Usage

```tsx
import { useObservable, useSubscribe } from '@mission-platform/rxjs/react';
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

### Vue 3 Usage

```vue
<script setup lang="ts">
  import { useObservable, useSubscribe } from '@mission-platform/rxjs/vue';
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

Subscribes to an RxJS `Observable` and exposes its latest value as reactive state. Unsubscribes automatically when the component unmounts or `source` changes.

- **`source`**: `Observable<T>`
- **`initialValue`**: Optional initial value of type `T` before the first emission.
- **Returns**: `T | undefined` (or `T` if `initialValue` is provided).

### `useSubscription(subscribe, dependencies?)`

Ties the lifetime of an RxJS subscription to the component lifecycle.

- **`subscribe`**: Function returning an object with an `unsubscribe()` method.
- **`dependencies`**: Optional dependency array triggering re-subscription.

### `useSubscribe(source, observerOrNext?, dependencies?)`

Convenience wrapper to subscribe directly to `source` with a next callback or observer.
