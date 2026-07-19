import { classNames, h, hasSlot, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';
import spacingStyles from '../spacing.module.scss';

import styles from './base-card.module.scss';

/** Inner padding scale of the card regions. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
/** Size token — canonical 2xs → 2xl scale. */
export type CardSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Colour tone of the card surface — the canonical colour set (`neutral` is the plain surface). */
export type CardVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Named outer-`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface CardProperties extends MpProperties {
  /** Inner padding of the header/body/footer regions. Defaults to `'md'`. */
  padding?: CardPadding;
  /** Colour tone of the card surface. Defaults to `'neutral'` (plain surface). */
  variant?: CardVariant;
  /** Drop a shadow under the card. */
  shadow?: boolean;
  /** Draw a 1px border around the card. Defaults to `true`. */
  bordered?: boolean;
  /** Size token controlling the card's intrinsic scale. Defaults to `'md'`. */
  size?: CardSize;
  /** Header content (the `header` named slot). When filled, a bordered header region is rendered. */
  header?: MpChild;
  /** Footer content (the `footer` named slot). When filled, a bordered footer region is rendered. */
  footer?: MpChild;
  /**
   * Outer margin (named `2xs … 2xl` scale), mapped to a `--mp-spacing-*` token.
   * Controls the card's outer spacing; the inner region padding is set with the
   * separate `padding` prop above.
   */
  margin?: SpacingScale;
}

/**
 * `BaseCard` — a surface container with optional header/footer regions, authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * The card is an inline-size container, so its padding responds to the card's
 * own width. It owns its styling through the co-located CSS Module
 * `base-card.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The body is the default slot; the optional `header` and `footer` named slots
 * each render their bordered region only when the slot is filled, detected with
 * the framework-neutral {@link hasSlot} helper (compiled to Vue's `$slots` /
 * React's prop-presence check) so presence detection works identically on both
 * frameworks.
 */
export function BaseCard(properties: Readonly<CardProperties>): MpElement {
  const { padding = 'md', shadow = false, bordered = true, variant = 'neutral', size = 'md', margin } = properties;

  // The optional outer `margin` (named `2xs … 2xl` scale) resolves to a shared
  // token-driven spacing class; the inner region `padding` keeps its own scale.
  const className = classNames(
    styles['base-card'],
    styles[`base-card--padding-${padding}`],
    styles[`base-card--${variant}`],
    sizeStyles[`base-size--${size}`],
    {
      [styles['base-card--shadow']]: shadow,
      [styles['base-card--bordered']]: bordered,
    },
    margin ? spacingStyles[`base-spacing--margin-${margin}`] : undefined,
  );

  return (
    <article classNames={className}>
      {hasSlot('header') ? (
        <div classNames={styles['base-card__header']}>
          <Slot name="header" />
        </div>
      ) : undefined}
      <div classNames={styles['base-card__body']}>
        <Slot />
      </div>
      {hasSlot('footer') ? (
        <div classNames={styles['base-card__footer']}>
          <Slot name="footer" />
        </div>
      ) : undefined}
    </article>
  );
}
