import { useEffect, useState } from '@mission-platform/forge';

import {
  type BreakpointKey,
  breakpointKeys,
  breakpoints,
  type BreakpointValues,
  resolveBreakpoint,
} from '../breakpoints';

/**
 * Reactive breakpoint state based on the document element's width.
 * Uses ResizeObserver if available, falling back to window resize events.
 * SSR-safe: returns a 0-width '2xs' band on the server.
 */
export function useBreakpoints(): { active: BreakpointKey; matches: BreakpointValues; width: number } {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const update = (): void => setWidth(window.innerWidth);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    } else {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === document.documentElement) {
            setWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(document.documentElement);
      return () => observer.disconnect();
    }
  }, []);

  const active = resolveBreakpoint(width);
  const matches = {} as BreakpointValues;
  for (const key of breakpointKeys) {
    matches[key] = width >= breakpoints[key];
  }

  return { active, matches, width };
}
