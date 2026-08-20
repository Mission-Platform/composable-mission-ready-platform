import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';
import { ForgeTypography } from '@mission-platform/typography';

import styles from './forge-badge.module.scss';

/** Visual tone of the badge. Mirrors the `@mission-platform/components` `ForgeBadge`. */
export type BadgeVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale, matching the shared size tokens. */
export type BadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BadgeProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Visual tone of the badge. Defaults to `'neutral'`. */
  variant?: BadgeVariant;
  /** Size step driving padding and font size. Defaults to `'md'`. */
  size?: BadgeSize;
  /** Use a fully rounded ("pill") shape. */
  pill?: boolean;
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
    <span className={className}>
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
