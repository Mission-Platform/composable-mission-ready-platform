import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-badge.module.scss';

/** Visual tone of the badge. Mirrors the `@mission-platform/components` `ForgeBadge`. */
export type BadgeVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale, matching the shared size tokens. */
export type BadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface BadgeStyleProperties {
  readonly 'feedback-badge-font-family'?: string;
  readonly 'feedback-badge-gap'?: string;
  readonly 'feedback-badge-line-height'?: string;
  readonly 'feedback-badge-pill-background'?: string;
  readonly 'feedback-badge-pill-text'?: string;
  readonly 'feedback-badge-radius-default'?: string;
  readonly 'feedback-badge-radius-pill'?: string;
  readonly 'feedback-badge-size-2xl-font-size'?: string;
  readonly 'feedback-badge-size-2xl-padding-block'?: string;
  readonly 'feedback-badge-size-2xl-padding-inline'?: string;
  readonly 'feedback-badge-size-2xs-font-size'?: string;
  readonly 'feedback-badge-size-2xs-padding-block'?: string;
  readonly 'feedback-badge-size-2xs-padding-inline'?: string;
  readonly 'feedback-badge-size-lg-font-size'?: string;
  readonly 'feedback-badge-size-lg-padding-block'?: string;
  readonly 'feedback-badge-size-lg-padding-inline'?: string;
  readonly 'feedback-badge-size-md-font-size'?: string;
  readonly 'feedback-badge-size-md-padding-block'?: string;
  readonly 'feedback-badge-size-md-padding-inline'?: string;
  readonly 'feedback-badge-size-sm-font-size'?: string;
  readonly 'feedback-badge-size-sm-padding-block'?: string;
  readonly 'feedback-badge-size-sm-padding-inline'?: string;
  readonly 'feedback-badge-size-xl-font-size'?: string;
  readonly 'feedback-badge-size-xl-padding-block'?: string;
  readonly 'feedback-badge-size-xl-padding-inline'?: string;
  readonly 'feedback-badge-size-xs-font-size'?: string;
  readonly 'feedback-badge-size-xs-padding-block'?: string;
  readonly 'feedback-badge-size-xs-padding-inline'?: string;
}

export type BadgeStyle = CSSStyleProperties & {
  readonly '--forge-badge-feedback-badge-font-family'?: string | undefined;
  readonly '--forge-badge-feedback-badge-gap'?: string | undefined;
  readonly '--forge-badge-feedback-badge-line-height'?: string | undefined;
  readonly '--forge-badge-feedback-badge-pill-background'?: string | undefined;
  readonly '--forge-badge-feedback-badge-pill-text'?: string | undefined;
  readonly '--forge-badge-feedback-badge-radius-default'?: string | undefined;
  readonly '--forge-badge-feedback-badge-radius-pill'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xl-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xl-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xl-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xs-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xs-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-2xs-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-lg-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-lg-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-lg-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-md-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-md-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-md-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-sm-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-sm-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-sm-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xl-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xl-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xl-padding-inline'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xs-font-size'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xs-padding-block'?: string | undefined;
  readonly '--forge-badge-feedback-badge-size-xs-padding-inline'?: string | undefined;
};

function createBadgeStyle(properties: Readonly<BadgeStyleProperties> | undefined): BadgeStyle | undefined {
  return createForgeStyle({
    '--forge-badge-feedback-badge-font-family': properties?.['feedback-badge-font-family'],
    '--forge-badge-feedback-badge-gap': properties?.['feedback-badge-gap'],
    '--forge-badge-feedback-badge-line-height': properties?.['feedback-badge-line-height'],
    '--forge-badge-feedback-badge-pill-background': properties?.['feedback-badge-pill-background'],
    '--forge-badge-feedback-badge-pill-text': properties?.['feedback-badge-pill-text'],
    '--forge-badge-feedback-badge-radius-default': properties?.['feedback-badge-radius-default'],
    '--forge-badge-feedback-badge-radius-pill': properties?.['feedback-badge-radius-pill'],
    '--forge-badge-feedback-badge-size-2xl-font-size': properties?.['feedback-badge-size-2xl-font-size'],
    '--forge-badge-feedback-badge-size-2xl-padding-block': properties?.['feedback-badge-size-2xl-padding-block'],
    '--forge-badge-feedback-badge-size-2xl-padding-inline': properties?.['feedback-badge-size-2xl-padding-inline'],
    '--forge-badge-feedback-badge-size-2xs-font-size': properties?.['feedback-badge-size-2xs-font-size'],
    '--forge-badge-feedback-badge-size-2xs-padding-block': properties?.['feedback-badge-size-2xs-padding-block'],
    '--forge-badge-feedback-badge-size-2xs-padding-inline': properties?.['feedback-badge-size-2xs-padding-inline'],
    '--forge-badge-feedback-badge-size-lg-font-size': properties?.['feedback-badge-size-lg-font-size'],
    '--forge-badge-feedback-badge-size-lg-padding-block': properties?.['feedback-badge-size-lg-padding-block'],
    '--forge-badge-feedback-badge-size-lg-padding-inline': properties?.['feedback-badge-size-lg-padding-inline'],
    '--forge-badge-feedback-badge-size-md-font-size': properties?.['feedback-badge-size-md-font-size'],
    '--forge-badge-feedback-badge-size-md-padding-block': properties?.['feedback-badge-size-md-padding-block'],
    '--forge-badge-feedback-badge-size-md-padding-inline': properties?.['feedback-badge-size-md-padding-inline'],
    '--forge-badge-feedback-badge-size-sm-font-size': properties?.['feedback-badge-size-sm-font-size'],
    '--forge-badge-feedback-badge-size-sm-padding-block': properties?.['feedback-badge-size-sm-padding-block'],
    '--forge-badge-feedback-badge-size-sm-padding-inline': properties?.['feedback-badge-size-sm-padding-inline'],
    '--forge-badge-feedback-badge-size-xl-font-size': properties?.['feedback-badge-size-xl-font-size'],
    '--forge-badge-feedback-badge-size-xl-padding-block': properties?.['feedback-badge-size-xl-padding-block'],
    '--forge-badge-feedback-badge-size-xl-padding-inline': properties?.['feedback-badge-size-xl-padding-inline'],
    '--forge-badge-feedback-badge-size-xs-font-size': properties?.['feedback-badge-size-xs-font-size'],
    '--forge-badge-feedback-badge-size-xs-padding-block': properties?.['feedback-badge-size-xs-padding-block'],
    '--forge-badge-feedback-badge-size-xs-padding-inline': properties?.['feedback-badge-size-xs-padding-inline'],
  }) as BadgeStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface BadgeProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Visual tone of the badge. Defaults to `'neutral'`. */
  variant?: BadgeVariant;
  /** Size step driving padding and font size. Defaults to `'md'`. */
  size?: BadgeSize;
  /** Use a fully rounded ("pill") shape. */
  pill?: boolean;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<BadgeStyleProperties>;
}

/**
 * `ForgeBadge` — a small status/label chip authored once in the neutral JSX
 * dialect. Render it on a framework with `toReactComponent(ForgeBadge)` or
 * `toVueComponent(ForgeBadge)`, or import the pre-adapted variant from
 * `@mission-platform/components` — the framework build is selected by the
 * consumer's `mp:<framework>` export condition, not by the specifier.
 *
 * It mirrors the `@mission-platform/components` `ForgeBadge`: the same nine tone
 * variants, the canonical `2xs → 2xl` size scale, and the label is rendered
 * through {@link ForgeTypography} (`caption`, medium weight, inherited colour) so
 * the typography matches the Vue library.
 *
 * It owns its styling through the co-located CSS Module `forge-badge.module.scss`
 * (carried onto every framework by the two-stage compiler, so the component
 * ships its own `@layer mp.components` CSS). The hashed module class names are
 * assembled with the framework-neutral {@link classNames} helper, which accepts
 * plain strings as well as the `{ className: boolean }` object form.
 */
export function ForgeBadge(properties: Readonly<BadgeProperties>): MpElement {
  const style = createBadgeStyle(properties.properties);

  const variant = properties.variant ?? 'neutral';
  const size = properties.size ?? 'md';
  const className = classNames(
    styles['forge-badge'],
    styles[`forge-badge--${variant}`],
    styles[`forge-badge--${size}`],
    {
      [styles['forge-badge--pill']]: properties.pill ?? false,
    },
  );

  return (
    <span
      className={className}
      style={style}
    >
      <ForgeTypography
        as="span"
        color="inherit"
        variant="caption"
        weight="medium"
      >
        {properties.children}
      </ForgeTypography>
    </span>
  );
}
