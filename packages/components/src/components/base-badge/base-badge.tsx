import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';

import styles from './base-badge.module.scss';

/** Visual tone of the badge. Mirrors the `@mission-platform/components` `BaseBadge`. */
export type BadgeVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Canonical 2xs → 2xl size scale, matching the shared size tokens. */
export type BadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BadgeProperties extends MpProperties {
  /** Visual tone of the badge. Defaults to `'neutral'`. */
  variant?: BadgeVariant;
  /** Size step driving padding and font size. Defaults to `'md'`. */
  size?: BadgeSize;
  /** Use a fully rounded ("pill") shape. */
  pill?: boolean;
}

/**
 * `BaseBadge` — a small status/label chip authored once in the neutral JSX
 * dialect. Render it on a framework with `toReactComponent(BaseBadge)` or
 * `toVueComponent(BaseBadge)`, or import the pre-adapted variants from
 * `@mission-platform/components/react` and `.../vue`.
 *
 * It mirrors the `@mission-platform/components` `BaseBadge`: the same nine tone
 * variants, the canonical `2xs → 2xl` size scale, and the label is rendered
 * through {@link BaseTypography} (`caption`, medium weight, inherited colour) so
 * the typography matches the Vue library.
 *
 * It owns its styling through the co-located CSS Module `base-badge.module.scss`
 * (carried onto every framework by the two-stage compiler, so the component
 * ships its own `@layer mp.components` CSS). The hashed module class names are
 * assembled with the framework-neutral {@link classNames} helper, which accepts
 * plain strings as well as the `{ className: boolean }` object form.
 */
export function BaseBadge(properties: Readonly<BadgeProperties>): MpElement {
  const variant = properties.variant ?? 'neutral';
  const size = properties.size ?? 'md';
  const className = classNames(styles['base-badge'], styles[`base-badge--${variant}`], styles[`base-badge--${size}`], {
    [styles['base-badge--pill']]: properties.pill ?? false,
  });

  return (
    <span className={className}>
      <BaseTypography
        as="span"
        color="inherit"
        variant="caption"
        weight="medium"
      >
        {properties.children}
      </BaseTypography>
    </span>
  );
}
