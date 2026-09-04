import {
  classNames,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';
import { ForgeTypography, type TypographyVariant } from '@mission-platform/typography';

import styles from './forge-quote.module.scss';

/** Visual treatment of the quote. */
export type QuoteVariant = 'default' | 'bordered' | 'plain';
/** Colour tone of the quote — the canonical colour set (`neutral` is the plain treatment). */
export type QuoteTone =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token controlling the quote text scale — canonical 2xs → 2xl scale. */
export type QuoteSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface QuoteStyleProperties {
  readonly 'surface-quote-attribution-gap'?: string;
  readonly 'surface-quote-attribution-marker'?: string;
  readonly 'surface-quote-background-critical'?: string;
  readonly 'surface-quote-background-error'?: string;
  readonly 'surface-quote-background-info'?: string;
  readonly 'surface-quote-background-neutral'?: string;
  readonly 'surface-quote-background-primary'?: string;
  readonly 'surface-quote-background-secondary'?: string;
  readonly 'surface-quote-background-success'?: string;
  readonly 'surface-quote-background-tertiary'?: string;
  readonly 'surface-quote-background-warning'?: string;
  readonly 'surface-quote-border-critical'?: string;
  readonly 'surface-quote-border-error'?: string;
  readonly 'surface-quote-border-info'?: string;
  readonly 'surface-quote-border-primary'?: string;
  readonly 'surface-quote-border-secondary'?: string;
  readonly 'surface-quote-border-success'?: string;
  readonly 'surface-quote-border-tertiary'?: string;
  readonly 'surface-quote-border-warning'?: string;
  readonly 'surface-quote-bordered-border-width'?: string;
  readonly 'surface-quote-bordered-padding'?: string;
  readonly 'surface-quote-default-padding'?: string;
  readonly 'surface-quote-default-radius'?: string;
  readonly 'surface-quote-gap'?: string;
}

export type QuoteStyle = CSSStyleProperties & {
  readonly '--forge-quote-surface-quote-attribution-gap'?: string | undefined;
  readonly '--forge-quote-surface-quote-attribution-marker'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-critical'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-error'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-info'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-neutral'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-primary'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-secondary'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-success'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-tertiary'?: string | undefined;
  readonly '--forge-quote-surface-quote-background-warning'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-critical'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-error'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-info'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-primary'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-secondary'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-success'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-tertiary'?: string | undefined;
  readonly '--forge-quote-surface-quote-border-warning'?: string | undefined;
  readonly '--forge-quote-surface-quote-bordered-border-width'?: string | undefined;
  readonly '--forge-quote-surface-quote-bordered-padding'?: string | undefined;
  readonly '--forge-quote-surface-quote-default-padding'?: string | undefined;
  readonly '--forge-quote-surface-quote-default-radius'?: string | undefined;
  readonly '--forge-quote-surface-quote-gap'?: string | undefined;
};

function createQuoteStyle(properties: Readonly<QuoteStyleProperties> | undefined): QuoteStyle | undefined {
  return createForgeStyle({
    '--forge-quote-surface-quote-attribution-gap': properties?.['surface-quote-attribution-gap'],
    '--forge-quote-surface-quote-attribution-marker': properties?.['surface-quote-attribution-marker'],
    '--forge-quote-surface-quote-background-critical': properties?.['surface-quote-background-critical'],
    '--forge-quote-surface-quote-background-error': properties?.['surface-quote-background-error'],
    '--forge-quote-surface-quote-background-info': properties?.['surface-quote-background-info'],
    '--forge-quote-surface-quote-background-neutral': properties?.['surface-quote-background-neutral'],
    '--forge-quote-surface-quote-background-primary': properties?.['surface-quote-background-primary'],
    '--forge-quote-surface-quote-background-secondary': properties?.['surface-quote-background-secondary'],
    '--forge-quote-surface-quote-background-success': properties?.['surface-quote-background-success'],
    '--forge-quote-surface-quote-background-tertiary': properties?.['surface-quote-background-tertiary'],
    '--forge-quote-surface-quote-background-warning': properties?.['surface-quote-background-warning'],
    '--forge-quote-surface-quote-border-critical': properties?.['surface-quote-border-critical'],
    '--forge-quote-surface-quote-border-error': properties?.['surface-quote-border-error'],
    '--forge-quote-surface-quote-border-info': properties?.['surface-quote-border-info'],
    '--forge-quote-surface-quote-border-primary': properties?.['surface-quote-border-primary'],
    '--forge-quote-surface-quote-border-secondary': properties?.['surface-quote-border-secondary'],
    '--forge-quote-surface-quote-border-success': properties?.['surface-quote-border-success'],
    '--forge-quote-surface-quote-border-tertiary': properties?.['surface-quote-border-tertiary'],
    '--forge-quote-surface-quote-border-warning': properties?.['surface-quote-border-warning'],
    '--forge-quote-surface-quote-bordered-border-width': properties?.['surface-quote-bordered-border-width'],
    '--forge-quote-surface-quote-bordered-padding': properties?.['surface-quote-bordered-padding'],
    '--forge-quote-surface-quote-default-padding': properties?.['surface-quote-default-padding'],
    '--forge-quote-surface-quote-default-radius': properties?.['surface-quote-default-radius'],
    '--forge-quote-surface-quote-gap': properties?.['surface-quote-gap'],
  }) as QuoteStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface QuoteProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Visual treatment. Defaults to `'default'`. */
  variant?: QuoteVariant;
  /** Colour tone (accent border/text). Defaults to `'neutral'`. */
  tone?: QuoteTone;
  /** Text size. Defaults to `'md'`. */
  size?: QuoteSize;
  /** Attribution author name. Rendered in the footer. */
  author?: string;
  /** Attribution source (e.g. a publication or role). Rendered after the author. */
  source?: string;
  /** Native `cite` attribute — a URL pointing to the source of the quotation. */
  cite?: string;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<QuoteStyleProperties>;
}

/** Maps the quote {@link QuoteSize} onto the body {@link TypographyVariant}. */
function textVariantFor(size: QuoteSize): TypographyVariant {
  const map: Record<QuoteSize, TypographyVariant> = {
    '2xs': 'body-sm',
    xs: 'body-md',
    sm: 'body-md',
    md: 'body-lg',
    lg: 'h4',
    xl: 'h3',
    '2xl': 'h2',
  };
  return map[size];
}

/**
 * `ForgeQuote` — a semantic blockquote / pull-quote authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders its default-slot content as the quotation (via the composed
 * neutral {@link ForgeTypography}) with optional `author`/`source` attribution
 * and a configurable visual treatment. It owns its styling through the
 * co-located CSS Module `forge-quote.module.scss`, assembled with the
 * framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC additionally exposed a scoped `author` slot (overriding
 * the `author`/`source` props) and detected slot presence; the neutral version
 * drops that scoped slot — attribution is driven by the `author`/`source` props
 * — consistent with how the other migrated components dropped scoped slots.
 */
export function ForgeQuote(properties: Readonly<QuoteProperties>): MpElement {
  const style = createQuoteStyle(properties.properties);

  const { variant = 'default', tone = 'neutral', size = 'md', author, source, cite } = properties;

  const className = classNames(
    styles['forge-quote'],
    styles[`forge-quote--${variant}`],
    styles[`forge-quote--tone-${tone}`],
    styles[`forge-quote--${size}`],
  );
  const hasAttribution = Boolean(author) || Boolean(source);

  return (
    <figure
      className={className}
      style={style}
    >
      <blockquote
        className={styles['forge-quote__content']}
        cite={cite}
      >
        <ForgeTypography
          as="p"
          variant={textVariantFor(size)}
          color="primary"
        >
          {properties.children}
        </ForgeTypography>
      </blockquote>
      {hasAttribution ? (
        <figcaption className={styles['forge-quote__attribution']}>
          <ForgeTypography
            as="span"
            color="secondary"
            variant="body-sm"
            weight="medium"
          >
            {author}
          </ForgeTypography>
          {source ? (
            <cite className={styles['forge-quote__source']}>
              <ForgeTypography
                as="span"
                color="tertiary"
                variant="body-sm"
              >
                {source}
              </ForgeTypography>
            </cite>
          ) : undefined}
        </figcaption>
      ) : undefined}
    </figure>
  );
}
