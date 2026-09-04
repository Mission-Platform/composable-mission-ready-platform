import { classNames, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge-jsx';

import styles from './forge-divider.module.scss';

/** Layout direction of the divider. */
export type DividerOrientation = 'horizontal' | 'vertical';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DividerStyleProperties {
  readonly 'color-border'?: string;
}

export type DividerStyle = CSSStyleProperties & {
  readonly '--forge-divider-color-border'?: string | undefined;
};

function createDividerStyle(properties: Readonly<DividerStyleProperties> | undefined): DividerStyle | undefined {
  return createForgeStyle({
    '--forge-divider-color-border': properties?.['color-border'],
  }) as DividerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DividerProperties {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: DividerOrientation;
  /** Whether to render the semantic separator markup. Defaults to `true`. */
  decorative?: boolean;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DividerStyleProperties>;
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
  const style = createDividerStyle(properties.properties);

  const orientation = properties.orientation ?? 'horizontal';
  const decorative = properties.decorative ?? true;
  const className = classNames(styles['forge-divider'], styles[`forge-divider--${orientation}`]);

  return decorative ? (
    <hr
      className={className}
      role="separator"
      aria-orientation={orientation}
      style={style}
    />
  ) : (
    <div
      className={className}
      role="separator"
      style={style}
    />
  );
}
