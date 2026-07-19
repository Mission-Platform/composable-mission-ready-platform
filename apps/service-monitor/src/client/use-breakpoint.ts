import { maxMediaQuery } from '@mission-platform/breakpoints/core';
import { useEffect, useState } from 'react';

/**
 * `true` when the viewport is at or below the `sm` breakpoint, tracked live via
 * `matchMedia`. Built on `@mission-platform/breakpoints`' framework-neutral
 * `maxMediaQuery` helper (its `useBreakpoints` composable is Vue-only), so the
 * React charts can shrink on small screens. Starts `false` for SSR parity and
 * resolves after mount.
 */
export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') {
      return;
    }
    const list = globalThis.matchMedia(maxMediaQuery('sm'));
    const update = (): void => setCompact(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);

  return compact;
}
