# `@mission-platform/forge-jsx`

A tiny, framework-neutral JSX runtime for components authored once and compiled
or rendered across supported frameworks.

## Overview

The package provides the neutral JSX factory (`h`, `Fragment`), hooks, context,
slots, transitions, portals, and other runtime primitives. Framework-specific
implementations are published separately in `@mission-platform/forge-adapters`.

## Package exports

- `@mission-platform/forge-jsx`: the public neutral authoring API.
- `@mission-platform/forge-jsx/runtime`: low-level neutral runtime primitives.
- `@mission-platform/forge-jsx/jsx-runtime`: automatic JSX runtime entry point.
- `@mission-platform/forge-jsx/jsx-dev-runtime`: development JSX runtime entry point.
- `@mission-platform/forge-jsx/jsx-globals`: global TypeScript JSX declarations.

## Installation

```bash
pnpm add @mission-platform/forge-jsx
```

## Usage

```tsx
import { Fragment, h, useState } from '@mission-platform/forge-jsx';

export function MyComponent({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <Fragment>
      <h1>Hello, {name}!</h1>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </Fragment>
  );
}
```

Render the component with the adapter package for the target framework:

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { toReactComponent } from '@mission-platform/forge-adapters/react';
```

## API summary

- `h` and `Fragment` create neutral `MpElement` trees.
- `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, and `useId` provide neutral hooks.
- `Slot`, `Teleport`, `Transition`, `TransitionGroup`, `Dynamic`, and `HtmlContent` provide neutral structure markers.
- `createContext`, `useContext`, and `classNames` provide shared runtime utilities.
