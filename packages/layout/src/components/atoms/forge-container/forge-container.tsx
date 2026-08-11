import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';

import sizeStyles from '../../size.module.scss';

import styles from './forge-container.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type ContainerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/**
 * The layout strategy the container uses to size itself on the inline axis:
 *
 * - `fixed` — a constant `max-width` (chosen by {@link ContainerMaxWidth}) that
 *   never changes with the viewport; the content block stays the same width on
 *   every screen and only the side gutters grow.
 * - `fluid` — always 100% of the available inline space (no `max-width`); the
 *   content stretches edge-to-edge as the viewport grows.
 * - `responsive` — a `max-width` that steps up at each platform breakpoint
 *   (mobile-first), so the content block widens in discrete jumps as the
 *   viewport crosses `xs → sm → md → lg → xl → 2xl`.
 */
export type ContainerVariant = 'fixed' | 'fluid' | 'responsive';
/** Named `max-width` steps for the `fixed` variant; each maps to a CSS length. */
export type ContainerMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named horizontal gutter scale; each step maps to a named `--mp-spacing-*` design token. */
export type ContainerGutter = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Maps each {@link ContainerMaxWidth} step onto a fixed CSS length (used by the `fixed` variant). */
const MAX_WIDTH: Record<ContainerMaxWidth, string> = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
  '2xl': '96rem',
};

export interface ContainerProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Sizing strategy on the inline axis. Defaults to `'responsive'`. */
  variant?: ContainerVariant;
  /**
   * The constant `max-width` for the `fixed` variant (named `sm … 2xl` scale).
   * Ignored by the `fluid` and `responsive` variants. Defaults to `'lg'`.
   */
  maxWidth?: ContainerMaxWidth;
  /**
   * Horizontal gutter (inline padding) applied on both sides (named `2xs … 2xl`
   * scale), mapped to a `--mp-spacing-*` token. Defaults to `'md'`.
   */
  gutter?: ContainerGutter;
  /** Whether the container is centred in its parent (`margin-inline: auto`). Defaults to `true`. */
  center?: boolean;
  /** The HTML tag the container renders as. */
  tag?: string;
  /** Size token controlling the container's font scale. Defaults to `'md'`. */
  size?: ContainerSize;
}

/**
 * `ForgeContainer` — a page/section layout primitive that constrains and centres
 * its content on the inline axis. It ships three sizing strategies through the
 * `variant` prop:
 *
 * - **`fixed`** — a constant `max-width` (the {@link ContainerMaxWidth} scale)
 *   that never changes with the viewport.
 * - **`fluid`** — always 100% of the available inline space.
 * - **`responsive`** — a `max-width` that steps up at each platform breakpoint
 *   (mobile-first), driven by the co-located `forge-container.module.scss`.
 *
 * Authored once in the neutral JSX dialect and compiled straight to React or
 * Vue by `@mission-platform/vite-plugin-forge`. The `fixed`/`fluid` widths and the
 * gutter/centring are emitted as inline styles; the `responsive` step-ups live
 * in the CSS Module (which inlines the platform breakpoints as media queries).
 */
export function ForgeContainer(properties: Readonly<ContainerProperties>): MpElement {
  const {
    variant = 'responsive',
    maxWidth = 'lg',
    gutter = 'md',
    center = true,
    tag = 'div',
    size = 'md',
  } = properties;

  const style: Record<string, string> = {
    boxSizing: 'border-box',
    width: '100%',
    paddingInline: `var(--mp-spacing-${gutter})`,
  };
  if (center) {
    style.marginInline = 'auto';
  }
  // `fixed` pins a constant max-width; `fluid` removes it entirely; `responsive`
  // leaves the cap to the breakpoint-stepped CSS Module class below.
  if (variant === 'fixed') {
    style.maxWidth = MAX_WIDTH[maxWidth];
  } else if (variant === 'fluid') {
    style.maxWidth = 'none';
  }

  const className = classNames(
    'forge-container',
    `forge-container--${variant}`,
    variant === 'responsive' ? styles['forge-container--responsive'] : undefined,
    sizeStyles[`forge-size--${size}`],
  );

  // Children must reach `h` as variadic args (the compile-time runtimes read
  // `...children`, not `properties.children`), so normalise the slot first.
  const children = properties.children;
  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  return h(tag, { class: className, style }, ...childList);
}
