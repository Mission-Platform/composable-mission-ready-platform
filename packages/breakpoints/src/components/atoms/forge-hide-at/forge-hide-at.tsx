import { Fragment, h, type MpChild, type MpElement, Slot, useEffect, useState } from '@mission-platform/forge';

import { type BreakpointKey, breakpoints } from '@/breakpoints';

export interface HideAtProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Hide slot content when the viewport is at or above this breakpoint. */
  min?: BreakpointKey;
  /** Hide slot content when the viewport is strictly below this breakpoint. */
  max?: BreakpointKey;
}

/**
 * `ForgeHideAt` — the inverse of {@link ForgeShowAt}: it hides its default slot when the
 * viewport is at or above `min` (and/or strictly below `max`) on the shared
 * seven-step breakpoint scale, and renders it otherwise. Authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The reactive viewport width is tracked through the neutral hooks
 * (`useState`/`useEffect`); the slot is wrapped in a layout-transparent
 * `display: contents` host so visibility can toggle without an extra layout box.
 */
export function ForgeHideAt(properties: Readonly<HideAtProperties>): MpElement {
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
  const hidden = aboveMin && belowMax;

  return <>{hidden ? undefined : <Slot />}</>;
}
