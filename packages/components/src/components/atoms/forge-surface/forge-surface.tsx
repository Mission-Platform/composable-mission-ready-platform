import { classNames, Dynamic, type MpChild, type MpElement } from '@mission-platform/forge';

import styles from './forge-surface.module.scss';

/** Surface elevation level. */
export type SurfaceElevation = 0 | 1 | 2 | 3;
/** Surface padding scale. */
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
/** Surface corner radius treatment. */
export type SurfaceRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl';

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
}

/** A themeable semantic surface with a default slot. */
export function ForgeSurface(properties: Readonly<SurfaceProperties>): MpElement {
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
    >
      {properties.children}
    </Dynamic>
  );
}
