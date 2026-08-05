import { h, type MpElement, type MpProperties, useEffect, useState } from '@mission-platform/forge';
import i18next from 'i18next';

import { breakpointKeys, breakpoints, resolveBreakpoint } from '../../../breakpoints';

import styles from './breakpoint-debug.module.scss';

export type BreakpointDebugProperties = MpProperties;

/**
 * `BreakpointDebug` — a development-time overlay pinned to the bottom-right
 * corner that displays the current active breakpoint and which breakpoints are
 * active for the live viewport width. Authored once in the neutral JSX dialect
 * and compiled straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * The reactive viewport width is tracked through the neutral hooks
 * (`useState`/`useEffect`). Its labels are localised through i18next: each
 * `i18next.t(...)` call carries a `defaultValue` (the English fallback), and
 * `@mission-platform/vite-plugin-forge` injects the framework `useI18n()` hook so
 * the same source resolves against the package's `mp.breakpoints` namespace on
 * both React and Vue.
 */
export function BreakpointDebug(_properties: Readonly<BreakpointDebugProperties>): MpElement {
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

  const current = resolveBreakpoint(width);

  return (
    <div
      aria-hidden="true"
      className={styles['bp-debug']}
    >
      <span className={styles['bp-debug__label']}>
        {i18next.t(($) => $.breakpoint, { ns: 'mp.breakpoints', defaultValue: 'breakpoint:' })}
      </span>
      <span className={styles['bp-debug__current']}>{current}</span>
      <span className={styles['bp-debug__separator']}>
        {i18next.t(($) => $.separator, { ns: 'mp.breakpoints', defaultValue: '|' })}
      </span>
      {breakpointKeys.map((key) => (
        <span
          key={key}
          className={[styles['bp-debug__badge'], { [styles['bp-debug__badge--active']]: width >= breakpoints[key] }]}
        >
          {key}
          <span className={styles['bp-debug__px']}>
            {i18next.t(($) => $.debug_px, {
              ns: 'mp.breakpoints',
              breakpoint: breakpoints[key],
              defaultValue: '({breakpoint}px)',
            })}
          </span>
        </span>
      ))}
    </div>
  );
}
