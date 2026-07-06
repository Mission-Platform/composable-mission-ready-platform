// ─── useObservable ────────────────────────────────────────────────────────────
//
// Framework-neutral: written once against the `@mission-platform/jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-jsx`. Subscribe to
// an RxJS `Observable` and expose its latest emission as component state, so a
// write-once component can render stream values reactively on both frameworks
// while the subscription is torn down automatically on unmount.

import { useEffect, useState } from '@mission-platform/jsx';
import type { Observable } from 'rxjs';

/**
 * Subscribe to `source` and return its latest emission as state. Returns
 * `undefined` until the first emission arrives.
 */
export function useObservable<T>(source: Observable<T>): T | undefined;
/**
 * Subscribe to `source` and return its latest emission as state, seeded with
 * `initialValue` until the first emission arrives.
 */
export function useObservable<T>(source: Observable<T>, initialValue: T): T;
export function useObservable<T>(source: Observable<T>, initialValue?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(initialValue);

  useEffect(() => {
    const subscription = source.subscribe((next) => {
      // Wrap in an updater so a function-typed emission is stored as-is rather
      // than being mistaken for a state updater.
      setValue(() => next);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [source]);

  return value;
}
