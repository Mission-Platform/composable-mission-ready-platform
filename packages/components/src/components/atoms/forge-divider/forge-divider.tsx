import { classNames, type MpElement } from '@mission-platform/forge';

import styles from './forge-divider.module.scss';

/** Layout direction of the divider. */
export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProperties {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: DividerOrientation;
  /** Whether to render the semantic separator markup. Defaults to `true`. */
  decorative?: boolean;
}

/**
 * `ForgeDivider` — a thin border divider authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It fills the available width or height according to `orientation` and uses
 * the semantic `<hr>` element by default. Set `decorative` to `false` to use a
 * role-bearing `<div>` instead.
 */
export function ForgeDivider(properties: Readonly<DividerProperties>): MpElement {
  const orientation = properties.orientation ?? 'horizontal';
  const decorative = properties.decorative ?? true;
  const className = classNames(styles['forge-divider'], styles[`forge-divider--${orientation}`]);

  return decorative ? (
    <hr
      className={className}
      role="separator"
      aria-orientation={orientation}
    />
  ) : (
    <div
      className={className}
      role="separator"
    />
  );
}
