# @mission-platform/observers

Framework-neutral browser observer composables for Mission Platform. Authored once against the `@mission-platform/forge-jsx`
neutral hooks and compiled to Vue 3, React 18/19, Solid, and Web Components.

## Hooks

- `useIntersectionObserver(target, callback, options?)` — Watches for changes in the intersection of a target element
  with an ancestor element or with a top-level document's viewport.
- `useMutationObserver(target, callback, options?)` — Watches for changes being made to the DOM tree.
- `usePerformanceObserver(callback, options?)` — Watches for new performance entries as they are recorded in the
  browser's performance log.

## SSR Safety

All hooks are SSR-safe and will no-op on the server where browser APIs are unavailable.

## Cleanup

Observers are automatically disconnected/cleaned up when the component is unmounted.
