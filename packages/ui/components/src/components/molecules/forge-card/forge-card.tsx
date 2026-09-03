import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import spacingStyles from '../../../styles/spacing.module.scss';

import styles from './forge-card.module.scss';

/** Inner padding scale of the card regions. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
/** Size token — canonical 2xs → 2xl scale. */
export type CardSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Colour tone of the card surface — the canonical colour set (`neutral` is the plain surface). */
export type CardVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Named outer-`margin` scale; each step maps to a named `--mp-spacing-*` design token. */
export type SpacingScale = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CardStyleProperties {
  readonly background?: string;
  readonly border?: string;
  readonly 'border-width'?: string;
  readonly 'padding-lg-block'?: string;
  readonly 'padding-lg-inline'?: string;
  readonly 'padding-lg-wide-block'?: string;
  readonly 'padding-lg-wide-inline'?: string;
  readonly 'padding-md-block'?: string;
  readonly 'padding-md-inline'?: string;
  readonly 'padding-md-wide-block'?: string;
  readonly 'padding-md-wide-inline'?: string;
  readonly 'padding-sm-block'?: string;
  readonly 'padding-sm-inline'?: string;
  readonly 'padding-sm-wide-block'?: string;
  readonly 'padding-sm-wide-inline'?: string;
  readonly radius?: string;
  readonly shadow?: string;
  readonly 'tone-bordered-background'?: string;
  readonly 'tone-bordered-border'?: string;
  readonly 'tone-bordered-text'?: string;
  readonly 'tone-padding-lg-background'?: string;
  readonly 'tone-padding-lg-border'?: string;
  readonly 'tone-padding-lg-text'?: string;
  readonly 'tone-padding-md-background'?: string;
  readonly 'tone-padding-md-border'?: string;
  readonly 'tone-padding-md-text'?: string;
  readonly 'tone-padding-none-background'?: string;
  readonly 'tone-padding-none-border'?: string;
  readonly 'tone-padding-none-text'?: string;
  readonly 'tone-padding-sm-background'?: string;
  readonly 'tone-padding-sm-border'?: string;
  readonly 'tone-padding-sm-text'?: string;
  readonly 'tone-shadow-background'?: string;
  readonly 'tone-shadow-border'?: string;
  readonly 'tone-shadow-text'?: string;
}

export type CardStyle = CSSStyleProperties & {
  readonly '--forge-card-background'?: string | undefined;
  readonly '--forge-card-border'?: string | undefined;
  readonly '--forge-card-border-width'?: string | undefined;
  readonly '--forge-card-padding-lg-block'?: string | undefined;
  readonly '--forge-card-padding-lg-inline'?: string | undefined;
  readonly '--forge-card-padding-lg-wide-block'?: string | undefined;
  readonly '--forge-card-padding-lg-wide-inline'?: string | undefined;
  readonly '--forge-card-padding-md-block'?: string | undefined;
  readonly '--forge-card-padding-md-inline'?: string | undefined;
  readonly '--forge-card-padding-md-wide-block'?: string | undefined;
  readonly '--forge-card-padding-md-wide-inline'?: string | undefined;
  readonly '--forge-card-padding-sm-block'?: string | undefined;
  readonly '--forge-card-padding-sm-inline'?: string | undefined;
  readonly '--forge-card-padding-sm-wide-block'?: string | undefined;
  readonly '--forge-card-padding-sm-wide-inline'?: string | undefined;
  readonly '--forge-card-radius'?: string | undefined;
  readonly '--forge-card-shadow'?: string | undefined;
  readonly '--forge-card-tone-bordered-background'?: string | undefined;
  readonly '--forge-card-tone-bordered-border'?: string | undefined;
  readonly '--forge-card-tone-bordered-text'?: string | undefined;
  readonly '--forge-card-tone-padding-lg-background'?: string | undefined;
  readonly '--forge-card-tone-padding-lg-border'?: string | undefined;
  readonly '--forge-card-tone-padding-lg-text'?: string | undefined;
  readonly '--forge-card-tone-padding-md-background'?: string | undefined;
  readonly '--forge-card-tone-padding-md-border'?: string | undefined;
  readonly '--forge-card-tone-padding-md-text'?: string | undefined;
  readonly '--forge-card-tone-padding-none-background'?: string | undefined;
  readonly '--forge-card-tone-padding-none-border'?: string | undefined;
  readonly '--forge-card-tone-padding-none-text'?: string | undefined;
  readonly '--forge-card-tone-padding-sm-background'?: string | undefined;
  readonly '--forge-card-tone-padding-sm-border'?: string | undefined;
  readonly '--forge-card-tone-padding-sm-text'?: string | undefined;
  readonly '--forge-card-tone-shadow-background'?: string | undefined;
  readonly '--forge-card-tone-shadow-border'?: string | undefined;
  readonly '--forge-card-tone-shadow-text'?: string | undefined;
};

function createCardStyle(properties: Readonly<CardStyleProperties> | undefined): CardStyle | undefined {
  return createForgeStyle({
    '--forge-card-background': properties?.['background'],
    '--forge-card-border': properties?.['border'],
    '--forge-card-border-width': properties?.['border-width'],
    '--forge-card-padding-lg-block': properties?.['padding-lg-block'],
    '--forge-card-padding-lg-inline': properties?.['padding-lg-inline'],
    '--forge-card-padding-lg-wide-block': properties?.['padding-lg-wide-block'],
    '--forge-card-padding-lg-wide-inline': properties?.['padding-lg-wide-inline'],
    '--forge-card-padding-md-block': properties?.['padding-md-block'],
    '--forge-card-padding-md-inline': properties?.['padding-md-inline'],
    '--forge-card-padding-md-wide-block': properties?.['padding-md-wide-block'],
    '--forge-card-padding-md-wide-inline': properties?.['padding-md-wide-inline'],
    '--forge-card-padding-sm-block': properties?.['padding-sm-block'],
    '--forge-card-padding-sm-inline': properties?.['padding-sm-inline'],
    '--forge-card-padding-sm-wide-block': properties?.['padding-sm-wide-block'],
    '--forge-card-padding-sm-wide-inline': properties?.['padding-sm-wide-inline'],
    '--forge-card-radius': properties?.['radius'],
    '--forge-card-shadow': properties?.['shadow'],
    '--forge-card-tone-bordered-background': properties?.['tone-bordered-background'],
    '--forge-card-tone-bordered-border': properties?.['tone-bordered-border'],
    '--forge-card-tone-bordered-text': properties?.['tone-bordered-text'],
    '--forge-card-tone-padding-lg-background': properties?.['tone-padding-lg-background'],
    '--forge-card-tone-padding-lg-border': properties?.['tone-padding-lg-border'],
    '--forge-card-tone-padding-lg-text': properties?.['tone-padding-lg-text'],
    '--forge-card-tone-padding-md-background': properties?.['tone-padding-md-background'],
    '--forge-card-tone-padding-md-border': properties?.['tone-padding-md-border'],
    '--forge-card-tone-padding-md-text': properties?.['tone-padding-md-text'],
    '--forge-card-tone-padding-none-background': properties?.['tone-padding-none-background'],
    '--forge-card-tone-padding-none-border': properties?.['tone-padding-none-border'],
    '--forge-card-tone-padding-none-text': properties?.['tone-padding-none-text'],
    '--forge-card-tone-padding-sm-background': properties?.['tone-padding-sm-background'],
    '--forge-card-tone-padding-sm-border': properties?.['tone-padding-sm-border'],
    '--forge-card-tone-padding-sm-text': properties?.['tone-padding-sm-text'],
    '--forge-card-tone-shadow-background': properties?.['tone-shadow-background'],
    '--forge-card-tone-shadow-border': properties?.['tone-shadow-border'],
    '--forge-card-tone-shadow-text': properties?.['tone-shadow-text'],
  }) as CardStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CardProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
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

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CardStyleProperties>;
}

/**
 * `ForgeCard` — a surface container with optional header/footer regions, authored
 * once in the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The card is an inline-size container, so its padding responds to the card's
 * own width. It owns its styling through the co-located CSS Module
 * `forge-card.module.scss`, assembled with the framework-neutral
 * {@link classNames} helper.
 *
 * The body is the default slot; the optional `header` and `footer` named slots
 * each render their bordered region only when the slot is filled, detected with
 * the framework-neutral {@link hasSlot} helper (compiled to Vue's `$slots` /
 * React's prop-presence check) so presence detection works identically on both
 * frameworks.
 */
export function ForgeCard(properties: Readonly<CardProperties>): MpElement {
  const style = createCardStyle(properties.properties);

  const { padding = 'md', shadow = false, bordered = true, variant = 'neutral', size = 'md', margin } = properties;

  // The optional outer `margin` (named `2xs … 2xl` scale) resolves to a shared
  // token-driven spacing class; the inner region `padding` keeps its own scale.
  const className = classNames(
    styles['forge-card'],
    styles[`forge-card--padding-${padding}`],
    styles[`forge-card--${variant}`],
    size ? `forge-size--${size}` : undefined,
    {
      [styles['forge-card--shadow']]: shadow,
      [styles['forge-card--bordered']]: bordered,
    },
    margin ? spacingStyles[`forge-spacing--margin-${margin}`] : undefined,
  );

  return (
    <article
      className={className}
      style={style}
    >
      {hasSlot('header') ? (
        <div className={styles['forge-card__header']}>
          <Slot name="header" />
        </div>
      ) : undefined}
      <div className={styles['forge-card__body']}>
        <Slot />
      </div>
      {hasSlot('footer') ? (
        <div className={styles['forge-card__footer']}>
          <Slot name="footer" />
        </div>
      ) : undefined}
    </article>
  );
}
