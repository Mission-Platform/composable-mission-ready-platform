import {
  classNames,
  Dynamic,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import spacingStyles from '../../../styles/spacing.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type StackSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Axis along which {@link ForgeStack} lays its children out. */
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

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface StackStyleProperties {
  readonly 'layout-stack-container-border'?: string;
  readonly 'layout-stack-container-border-width'?: string;
  readonly 'layout-stack-container-padding'?: string;
  readonly 'layout-stack-container-radius'?: string;
  readonly 'layout-stack-item-border'?: string;
  readonly 'layout-stack-item-border-width'?: string;
  readonly 'layout-stack-item-padding-block'?: string;
  readonly 'layout-stack-item-padding-inline'?: string;
  readonly 'layout-stack-item-radius'?: string;
  readonly 'layout-stack-item-surface'?: string;
  readonly 'layout-stack-item-text'?: string;
}

export type StackStyle = CSSStyleProperties & {
  readonly '--forge-stack-layout-stack-container-border'?: string | undefined;
  readonly '--forge-stack-layout-stack-container-border-width'?: string | undefined;
  readonly '--forge-stack-layout-stack-container-padding'?: string | undefined;
  readonly '--forge-stack-layout-stack-container-radius'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-border'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-border-width'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-padding-block'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-padding-inline'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-radius'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-surface'?: string | undefined;
  readonly '--forge-stack-layout-stack-item-text'?: string | undefined;
};

function createStackStyle(properties: Readonly<StackStyleProperties> | undefined): StackStyle | undefined {
  return createForgeStyle({
    '--forge-stack-layout-stack-container-border': properties?.['layout-stack-container-border'],
    '--forge-stack-layout-stack-container-border-width': properties?.['layout-stack-container-border-width'],
    '--forge-stack-layout-stack-container-padding': properties?.['layout-stack-container-padding'],
    '--forge-stack-layout-stack-container-radius': properties?.['layout-stack-container-radius'],
    '--forge-stack-layout-stack-item-border': properties?.['layout-stack-item-border'],
    '--forge-stack-layout-stack-item-border-width': properties?.['layout-stack-item-border-width'],
    '--forge-stack-layout-stack-item-padding-block': properties?.['layout-stack-item-padding-block'],
    '--forge-stack-layout-stack-item-padding-inline': properties?.['layout-stack-item-padding-inline'],
    '--forge-stack-layout-stack-item-radius': properties?.['layout-stack-item-radius'],
    '--forge-stack-layout-stack-item-surface': properties?.['layout-stack-item-surface'],
    '--forge-stack-layout-stack-item-text': properties?.['layout-stack-item-text'],
  }) as StackStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface StackProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<StackStyleProperties>;
}

/**
 * `ForgeStack` — a flexbox stack layout primitive that lays its children out in
 * a single line, either **vertically** (a column) or **horizontally** (a row),
 * with a consistent `gap` between them. Authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It emits BEM class names plus the computed flexbox inline style; the demo
 * styling lives in the co-located `forge-stack.module.scss` (imported by
 * `forge-stack.stories.tsx`).
 */
export function ForgeStack(properties: Readonly<StackProperties>): MpElement {
  const propertyStyle = createStackStyle(properties.properties);

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
    'forge-stack',
    `forge-stack--${direction}`,
    padding ? spacingStyles[`forge-spacing--padding-${padding}`] : undefined,
    margin ? spacingStyles[`forge-spacing--margin-${margin}`] : undefined,
    size ? `forge-size--${size}` : undefined,
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
      style={{ ...style, ...propertyStyle }}
    >
      {properties.children}
    </Dynamic>
  );
}
