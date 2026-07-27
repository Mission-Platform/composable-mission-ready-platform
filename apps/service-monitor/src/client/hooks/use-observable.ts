import { useEffect, useState } from 'react';

import type { Observable } from 'rxjs';

/**
 * Bridge an RxJS `Observable` into React component state.
 *
 * The subscription is tied to the component lifecycle: it is created on mount
 * (or whenever `source` changes) and torn down on unmount. Pass a memoized
 * `source` (e.g. via `useMemo`) so the effect does not resubscribe on every
 * render.
 *
 * @param source  The stream to observe.
 * @param initial The value to render until the first emission arrives.
 */
export function useObservable<T>(source: Observable<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const subscription = source.subscribe({
      next: setValue,
      error: (error: unknown) => {
        console.error('useObservable stream error', error);
      },
    });
    return () => subscription.unsubscribe();
  }, [source]);

  return value;
}
