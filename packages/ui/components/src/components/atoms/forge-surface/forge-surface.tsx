import {
  classNames,
  Dynamic,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-surface.module.scss';

/** Surface elevation level. */
export type SurfaceElevation = 0 | 1 | 2 | 3;
/** Surface padding scale. */
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
/** Surface corner radius treatment. */
export type SurfaceRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface SurfaceStyleProperties {
  readonly background?: string;
  readonly 'elevation-lg'?: string;
  readonly 'elevation-md'?: string;
  readonly 'elevation-none'?: string;
  readonly 'elevation-sm'?: string;
  readonly 'elevation-xl'?: string;
  readonly 'padding-lg'?: string;
  readonly 'padding-md'?: string;
  readonly 'padding-none'?: string;
  readonly 'padding-sm'?: string;
  readonly 'rounded-lg'?: string;
  readonly 'rounded-md'?: string;
  readonly 'rounded-none'?: string;
  readonly 'rounded-sm'?: string;
  readonly 'rounded-xl'?: string;
  readonly text?: string;
}

export type SurfaceStyle = CSSStyleProperties & {
  readonly '--forge-surface-background'?: string | undefined;
  readonly '--forge-surface-elevation-lg'?: string | undefined;
  readonly '--forge-surface-elevation-md'?: string | undefined;
  readonly '--forge-surface-elevation-none'?: string | undefined;
  readonly '--forge-surface-elevation-sm'?: string | undefined;
  readonly '--forge-surface-elevation-xl'?: string | undefined;
  readonly '--forge-surface-padding-lg'?: string | undefined;
  readonly '--forge-surface-padding-md'?: string | undefined;
  readonly '--forge-surface-padding-none'?: string | undefined;
  readonly '--forge-surface-padding-sm'?: string | undefined;
  readonly '--forge-surface-rounded-lg'?: string | undefined;
  readonly '--forge-surface-rounded-md'?: string | undefined;
  readonly '--forge-surface-rounded-none'?: string | undefined;
  readonly '--forge-surface-rounded-sm'?: string | undefined;
  readonly '--forge-surface-rounded-xl'?: string | undefined;
  readonly '--forge-surface-text'?: string | undefined;
};

function createSurfaceStyle(properties: Readonly<SurfaceStyleProperties> | undefined): SurfaceStyle | undefined {
  return createForgeStyle({
    '--forge-surface-background': properties?.['background'],
    '--forge-surface-elevation-lg': properties?.['elevation-lg'],
    '--forge-surface-elevation-md': properties?.['elevation-md'],
    '--forge-surface-elevation-none': properties?.['elevation-none'],
    '--forge-surface-elevation-sm': properties?.['elevation-sm'],
    '--forge-surface-elevation-xl': properties?.['elevation-xl'],
    '--forge-surface-padding-lg': properties?.['padding-lg'],
    '--forge-surface-padding-md': properties?.['padding-md'],
    '--forge-surface-padding-none': properties?.['padding-none'],
    '--forge-surface-padding-sm': properties?.['padding-sm'],
    '--forge-surface-rounded-lg': properties?.['rounded-lg'],
    '--forge-surface-rounded-md': properties?.['rounded-md'],
    '--forge-surface-rounded-none': properties?.['rounded-none'],
    '--forge-surface-rounded-sm': properties?.['rounded-sm'],
    '--forge-surface-rounded-xl': properties?.['rounded-xl'],
    '--forge-surface-text': properties?.['text'],
  }) as SurfaceStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface SurfaceProperties {
  /** Default-slot content. */
  children?: MpChild | readonly MpChild[];
  /** Rendered element name. Defaults to `'div'`. */
  as?: string;
  /** Elevation level. Defaults to `0`. */
  elevation?: SurfaceElevation;
  /** Inner padding. Defaults to `'md'`. */
  padding?: SurfacePadding;
  /** Corner rounding. Defaults to `'md'`. */
  rounded?: SurfaceRounded;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<SurfaceStyleProperties>;
}

/** A themeable semantic surface with a default slot. */
export function ForgeSurface(properties: Readonly<SurfaceProperties>): MpElement {
  const style = createSurfaceStyle(properties.properties);

  const { as = 'div', elevation = 0, padding = 'md', rounded = 'md' } = properties;
  const className = classNames(
    styles['forge-surface'],
    styles[`forge-surface--elevation-${elevation}`],
    styles[`forge-surface--padding-${padding}`],
    styles[`forge-surface--rounded-${rounded}`],
  );
  return (
    <Dynamic
      is={as}
      className={className}
      style={style}
    >
      {properties.children}
    </Dynamic>
  );
}
