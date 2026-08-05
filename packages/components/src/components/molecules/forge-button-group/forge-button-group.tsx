import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './forge-button-group.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ButtonGroupSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Layout direction of the grouped buttons. */
export type ButtonGroupOrientation = 'horizontal' | 'vertical';
/** Spacing between detached buttons. */
export type ButtonGroupGap = 'none' | 'xs' | 'sm' | 'md';
/** Colour tone of the group — the canonical colour set (`neutral` is the plain treatment). */
export type ButtonGroupVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

export interface ButtonGroupProperties extends MpProperties {
  /** Layout direction. Defaults to `'horizontal'`. */
  orientation?: ButtonGroupOrientation;
  /** Visually join children by collapsing inner border radii and gaps. */
  attached?: boolean;
  /** Gap between buttons when not `attached`. Defaults to `'sm'`. */
  gap?: ButtonGroupGap;
  /** Colour tone of the group (tints the `attached` separators). Defaults to `'neutral'`. */
  variant?: ButtonGroupVariant;
  /** Size token controlling the group's scale. Defaults to `'md'`. */
  size?: ButtonGroupSize;
  /** Accessible label describing the group. */
  ariaLabel?: string;
}

/**
 * `ForgeButtonGroup` — groups related buttons into a single visual unit. Authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It wraps its default-slot children (typically `Button` / `IconButton`
 * instances) in a flex container; when `attached` is set the children are
 * visually joined by collapsing inner border radii and gaps so the group reads
 * as a single segmented control. It exposes `role="group"`; pass `ariaLabel` to
 * describe the group.
 *
 * It owns its styling through the co-located CSS Module
 * `forge-button-group.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 */
export function ForgeButtonGroup(properties: Readonly<ButtonGroupProperties>): MpElement {
  const {
    orientation = 'horizontal',
    attached = false,
    gap = 'sm',
    variant = 'neutral',
    size = 'md',
    ariaLabel,
  } = properties;

  const className = classNames(
    styles['forge-button-group'],
    styles[`forge-button-group--${orientation}`],
    styles[`forge-button-group--gap-${gap}`],
    styles[`forge-button-group--${variant}`],
    sizeStyles[`forge-size--${size}`],
    { [styles['forge-button-group--attached']]: attached },
  );

  return (
    <div
      aria-label={ariaLabel}
      className={className}
      role="group"
    >
      {properties.children}
    </div>
  );
}
