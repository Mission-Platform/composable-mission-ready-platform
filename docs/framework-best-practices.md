# Framework Best Practices

This document provides guidance on idiomatic patterns, reactivity models, and performance optimizations for the frameworks supported by the Mission Platform. It serves as an **Explanation** of our multi-framework strategy and a reference for framework-specific development.

## Multi-Framework Strategy

The Mission Platform core philosophy is to build once and render everywhere. This is achieved through **@mission-platform/forge**, the primary framework of the platform: a framework-neutral JSX runtime in which all shared components (everything except the apps) are authored and from which they are rendered seamlessly in Vue 3, React, and other supported environments.

### The Forge Dialect
When building shared packages, author components using Forge's neutral primitives:
- **JSX Factory**: Use `h` and `Fragment` from `@mission-platform/forge`.
- **Neutral Hooks**: Use `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, and `useId`.
- **Primitives**: Use `Slot`, `Teleport`, `Transition`, and `Dynamic` for complex UI structures.

## Vue 3

Vue 3 is the framework the applications in `apps/` are built with, and the primary native render target for Forge components. Shared components themselves are authored in Forge JSX rather than directly in Vue.

### Idiomatic Patterns
- **Composition API**: Use `<script setup lang="ts">` for all new components.
- **Forge Integration**: Wrap neutral components using `toVueComponent` from `@mission-platform/forge/vue`.
- **Composables**: Extract stateful logic into `useXxx` functions to promote reusability.

### Performance Optimizations
- **Shallow Reactivity**: Use `shallowRef` or `shallowReactive` for large, complex datasets to avoid proxy overhead.
- **v-memo**: Use `v-memo` in templates to skip expensive sub-tree updates based on dependency changes.
- **markRaw**: Wrap third-party library instances (e.g., Chart.js, Mapbox) in `markRaw` to prevent Vue from attempting to make them reactive.

## React

React is supported via the Forge runtime adapter, primarily for external integrations and specific internal tools.

### Idiomatic Patterns
- **Functional Components**: Use functional components with hooks.
- **Forge Integration**: Wrap neutral components using `toReactComponent` from `@mission-platform/forge/react`.
- **Hooks Discipline**: strictly follow the "Rules of Hooks" to ensure predictable behavior.

### Performance Optimizations
- **Memoization**: Use `React.memo`, `useMemo`, and `useCallback` to maintain referential identity and avoid unnecessary re-renders.
- **Concurrent Features**: Leverage `useTransition` or `useDeferredValue` for non-urgent UI updates to keep the main thread responsive.

## Other Frameworks

Mission Platform provides varying levels of support for other frameworks through Forge adapters:

- **SolidJS**: Uses fine-grained reactivity via signals. Avoid destructuring props to maintain reactivity.
- **Svelte 5**: Leverages runes (`$state`, `$derived`, `$effect`) for modern reactivity.
- **Web Components (Lit)**: Useful for building highly portable components that need to run in legacy environments or without a framework.

## Performance & Reactivity Models

| Framework | Reactivity Model | Update Strategy |
| :--- | :--- | :--- |
| **Vue 3** | Proxy-based | Virtual DOM with compiler optimizations. |
| **React** | Immutable State | Virtual DOM Reconciliation. |
| **SolidJS** | Fine-grained Signals | Direct DOM updates (no VDOM). |
| **Svelte 5** | Runes / Signals | Direct DOM updates via compiler. |
| **Lit** | Reactive Properties | Asynchronous Shadow DOM updates. |

## Related Resources
- [Best Practices](best-practices.md)
- [Testing Guide](testing.md)
- [@mission-platform/forge README](../packages/forge/README.md)
