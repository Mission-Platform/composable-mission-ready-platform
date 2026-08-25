import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ButtonGroupStyleProperties {
  readonly 'border-attached'?: string;
  readonly 'border-horizontal'?: string;
  readonly 'border-vertical'?: string;
  readonly 'gap-md'?: string;
  readonly 'gap-none'?: string;
  readonly 'gap-sm'?: string;
  readonly 'gap-xs'?: string;
}

export type ButtonGroupStyle = CSSStyleProperties & {
  readonly '--forge-button-group-border-attached'?: string | undefined;
  readonly '--forge-button-group-border-horizontal'?: string | undefined;
  readonly '--forge-button-group-border-vertical'?: string | undefined;
  readonly '--forge-button-group-gap-md'?: string | undefined;
  readonly '--forge-button-group-gap-none'?: string | undefined;
  readonly '--forge-button-group-gap-sm'?: string | undefined;
  readonly '--forge-button-group-gap-xs'?: string | undefined;
};

function createButtonGroupStyle(
  properties: Readonly<ButtonGroupStyleProperties> | undefined,
): ButtonGroupStyle | undefined {
  return createForgeStyle({
    '--forge-button-group-border-attached': properties?.['border-attached'],
    '--forge-button-group-border-horizontal': properties?.['border-horizontal'],
    '--forge-button-group-border-vertical': properties?.['border-vertical'],
    '--forge-button-group-gap-md': properties?.['gap-md'],
    '--forge-button-group-gap-none': properties?.['gap-none'],
    '--forge-button-group-gap-sm': properties?.['gap-sm'],
    '--forge-button-group-gap-xs': properties?.['gap-xs'],
  }) as ButtonGroupStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ButtonGroupProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ButtonGroupStyleProperties>;
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
  const style = createButtonGroupStyle(properties.properties);

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
    size ? `forge-size--${size}` : undefined,
    { [styles['forge-button-group--attached']]: attached },
  );

  return (
    <div
      aria-label={ariaLabel}
      className={className}
      role="group"
      style={style}
    >
      {properties.children}
    </div>
  );
}
