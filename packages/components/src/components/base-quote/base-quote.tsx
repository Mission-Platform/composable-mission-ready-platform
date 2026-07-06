import { classNames, h, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography, type TypographyVariant } from '../base-typography';

import styles from './base-quote.module.scss';

/** Visual treatment of the quote. */
export type QuoteVariant = 'default' | 'bordered' | 'plain';
/** Colour tone of the quote — the canonical colour set (`neutral` is the plain treatment). */
export type QuoteTone =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token controlling the quote text scale — canonical 2xs → 2xl scale. */
export type QuoteSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface QuoteProperties extends MpProperties {
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
 * `BaseQuote` — a semantic blockquote / pull-quote authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders its default-slot content as the quotation (via the composed
 * neutral {@link BaseTypography}) with optional `author`/`source` attribution
 * and a configurable visual treatment. It owns its styling through the
 * co-located CSS Module `base-quote.module.scss`, assembled with the
 * framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC additionally exposed a scoped `author` slot (overriding
 * the `author`/`source` props) and detected slot presence; the neutral version
 * drops that scoped slot — attribution is driven by the `author`/`source` props
 * — consistent with how the other migrated components dropped scoped slots.
 */
export function BaseQuote(properties: QuoteProperties): MpElement {
  const { variant = 'default', tone = 'neutral', size = 'md', author, source, cite } = properties;

  const className = classNames(
    styles['base-quote'],
    styles[`base-quote--${variant}`],
    styles[`base-quote--tone-${tone}`],
    styles[`base-quote--${size}`],
  );
  const hasAttribution = Boolean(author) || Boolean(source);

  return (
    <figure classNames={className}>
      <blockquote
        classNames={styles['base-quote__content']}
        cite={cite}
      >
        <BaseTypography
          as="p"
          variant={textVariantFor(size)}
          color="primary"
        >
          {properties.children}
        </BaseTypography>
      </blockquote>
      {hasAttribution ? (
        <figcaption classNames={styles['base-quote__attribution']}>
          <BaseTypography
            as="span"
            color="secondary"
            variant="body-sm"
            weight="medium"
          >
            {author}
          </BaseTypography>
          {source ? (
            <cite classNames={styles['base-quote__source']}>
              <BaseTypography
                as="span"
                color="tertiary"
                variant="body-sm"
              >
                {source}
              </BaseTypography>
            </cite>
          ) : undefined}
        </figcaption>
      ) : undefined}
    </figure>
  );
}
