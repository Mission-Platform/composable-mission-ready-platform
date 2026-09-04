// ─── useSubscription ──────────────────────────────────────────────────────────
//
// Framework-neutral: written once against the `@mission-platform/forge-jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`. Tie the
// lifetime of an RxJS subscription to a component's effect: it is created after
// mount and torn down on unmount (or when the dependency list changes), so
// streams never leak — identically on both frameworks.

import { type MpDependencyList, useEffect } from '@mission-platform/forge-jsx';

import type { Observable, Observer } from 'rxjs';

/** Anything that can be unsubscribed — matches RxJS's `Unsubscribable`. */
export interface Unsubscribable {
  unsubscribe(): void;
}

/**
 * Run `subscribe` after mount and unsubscribe from its result on unmount (and
 * whenever `dependencies` change). `subscribe` returns any `Unsubscribable`, so
 * it can wrap a bare `source.subscribe(...)` call or a whole pipeline.
 */
export function useSubscription(subscribe: () => Unsubscribable, dependencies: MpDependencyList = []): void {
  useEffect(() => {
    const subscription = subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, dependencies);
}

/**
 * Subscribe to `source` with the given `observer` (or `next` callback) for the
 * lifetime of the component, re-subscribing when `source` (or any extra
 * `dependencies`) changes.
 */
export function useSubscribe<T>(
  source: Observable<T>,
  observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
  dependencies: MpDependencyList = [],
): void {
  useSubscription(() => source.subscribe(observerOrNext), [source, ...dependencies]);
}
