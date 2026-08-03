// ─── @mission-platform/rxjs ───────────────────────────────────────────────────
//
// A framework-neutral bridge between RxJS `Observable`s and the write-once
// `@mission-platform/forge` component model. Authored once against the neutral
// hooks and compiled to React and Vue by `@mission-platform/vite-plugin-forge`,
// so a single component can compose streams with the full RxJS operator
// vocabulary and render their values on both frameworks: observables flow into
// component state (`useObservable`), and subscriptions are tied to the
// component effect lifecycle (`useSubscription`/`useSubscribe`).

// Subscription lifetime binding.
export { useSubscribe, useSubscription, type Unsubscribable } from './composables/use-subscription';

// Observable → component state.
export { useObservable } from './composables/use-observable';
