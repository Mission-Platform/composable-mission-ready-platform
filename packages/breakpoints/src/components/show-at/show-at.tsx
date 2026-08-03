import { Fragment, h, type MpElement, type MpProperties, Slot, useEffect, useState } from '@mission-platform/forge';

import { type BreakpointKey, breakpoints } from '../../breakpoints';

export interface ShowAtProperties extends MpProperties {
  /** Show slot content when the viewport is at or above this breakpoint. */
  min?: BreakpointKey;
  /** Show slot content when the viewport is strictly below this breakpoint. */
  max?: BreakpointKey;
}

/**
 * `ShowAt` — conditionally renders its default slot only when the viewport is at
 * or above `min` (and/or strictly below `max`) on the shared seven-step
 * breakpoint scale. Authored once in the neutral JSX dialect and compiled
 * straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * The reactive viewport width is tracked through the neutral hooks
 * (`useState`/`useEffect`), which compile to React hooks or the Vue hook shim.
 * Because the neutral dialect has no conditional-root return, the slot is
 * wrapped in a layout-transparent `display: contents` host so visibility can
 * toggle without introducing an extra layout box.
 */
export function ShowAt(properties: Readonly<ShowAtProperties>): MpElement {
  const { min, max } = properties;

  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }
    const update = (): void => setWidth(globalThis.window.innerWidth);
    update();
    globalThis.window.addEventListener('resize', update);
    return () => globalThis.window.removeEventListener('resize', update);
  }, []);

  const aboveMin = min === undefined || width >= breakpoints[min];
  const belowMax = max === undefined || width < breakpoints[max];
  const visible = aboveMin && belowMax;

  return <>{visible ? <Slot /> : undefined}</>;
}
