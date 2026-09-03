// ─── @mission-platform/rxjs · composables ────────────────────────────────────
//
// Write-once composables bridging RxJS `Observable`s into the neutral
// `@mission-platform/jsx` component model. Authored once against the neutral
// hooks and compiled to every supported framework by
// `@mission-platform/vite-plugin-jsx`.

// Subscription lifetime binding.
export { useSubscribe, useSubscription, type Unsubscribable } from './use-subscription';

// Observable → component state.
export { useObservable } from './use-observable';
