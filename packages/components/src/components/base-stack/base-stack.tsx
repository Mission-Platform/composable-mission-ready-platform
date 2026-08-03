import { classNames, Dynamic, h, type MpElement, type MpProperties } from '@mission-platform/forge';

import sizeStyles from '../size.module.scss';
import spacingStyles from '../spacing.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type StackSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Axis along which {@link BaseStack} lays its children out. */
export type StackDirection = 'vertical' | 'horizontal';
/** Main-axis distribution keywords (`justify` → `justify-content`). */
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
/** Cross-axis placement keywords (`align` → `align-items`). */
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
/** Named gap scale; each step resolves to a `--mp-spacing-*` design token. */
export type StackGap = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Named `padding`/`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Maps each {@link StackGap} step onto a `--mp-spacing-*` token. */
const GAP_SPACING: Record<StackGap, string> = {
  '2xs': 'var(--mp-spacing-1)',
  xs: 'var(--mp-spacing-2)',
  sm: 'var(--mp-spacing-3)',
  md: 'var(--mp-spacing-4)',
  lg: 'var(--mp-spacing-6)',
  xl: 'var(--mp-spacing-8)',
  '2xl': 'var(--mp-spacing-12)',
};

/** Maps each {@link StackJustify} step onto its `justify-content` value. */
const JUSTIFY_CONTENT: Record<StackJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

/** Maps each {@link StackAlign} step onto its `align-items` value. */
const ALIGN_ITEMS: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

export interface StackProperties extends MpProperties {
  /** Axis the children flow along: `vertical` (column) or `horizontal` (row). */
  direction?: StackDirection;
  /** Gap between children (named `2xs … 2xl` scale). */
  gap?: StackGap;
  /** Main-axis distribution of the children (`justify-content`). */
  justify?: StackJustify;
  /** Cross-axis placement of the children (`align-items`). */
  align?: StackAlign;
  /** Whether children wrap onto multiple lines when they overflow. */
  wrap?: boolean;
  /** Render as an inline flex container (`inline-flex`) rather than a block. */
  inline?: boolean;
  /** The HTML tag the stack container renders as. */
  tag?: string;
  /** Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  margin?: SpacingScale;
  /** Inner padding (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token. */
  padding?: SpacingScale;
  /** Size token controlling the stack's font scale. Defaults to `'md'`. */
  size?: StackSize;
}

/**
 * `BaseStack` — a flexbox stack layout primitive that lays its children out in
 * a single line, either **vertically** (a column) or **horizontally** (a row),
 * with a consistent `gap` between them. Authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It emits BEM class names plus the computed flexbox inline style; the demo
 * styling lives in the co-located `base-stack.module.scss` (imported by
 * `base-stack.stories.tsx`).
 */
export function BaseStack(properties: Readonly<StackProperties>): MpElement {
  const {
    direction = 'vertical',
    gap = 'md',
    justify = 'start',
    align = 'stretch',
    wrap = false,
    inline = false,
    tag = 'div',
    padding,
    margin,
    size = 'md',
  } = properties;

  // Optional `padding`/`margin` (named `2xs … 2xl` scale) resolve to the shared
  // token-driven spacing classes rather than inline styles.
  const className = classNames(
    'base-stack',
    `base-stack--${direction}`,
    padding ? spacingStyles[`base-spacing--padding-${padding}`] : undefined,
    margin ? spacingStyles[`base-spacing--margin-${margin}`] : undefined,
    sizeStyles[`base-size--${size}`],
  );
  const style: Record<string, string> = {
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    gap: GAP_SPACING[gap],
    justifyContent: JUSTIFY_CONTENT[justify],
    alignItems: ALIGN_ITEMS[align],
    minWidth: '0',
    width: direction === 'vertical' ? '100%' : 'auto',
  };

  return (
    <Dynamic
      is={tag}
      className={className}
      style={style}
    >
      {properties.children}
    </Dynamic>
  );
}
