import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';
import { ForgeTypography, type TypographyVariant } from '@mission-platform/typography';

import styles from './forge-quote.module.scss';

/** Visual treatment of the quote. */
export type QuoteVariant = 'default' | 'bordered' | 'plain';
/** Colour tone of the quote — the canonical colour set (`neutral` is the plain treatment). */
export type QuoteTone =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Size token controlling the quote text scale — canonical 2xs → 2xl scale. */
export type QuoteSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

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
  const { variant = 'default', tone = 'neutral', size = 'md', author, source, cite } = properties;

  const className = classNames(
    styles['forge-quote'],
    styles[`forge-quote--${variant}`],
    styles[`forge-quote--tone-${tone}`],
    styles[`forge-quote--${size}`],
  );
  const hasAttribution = Boolean(author) || Boolean(source);

  return (
    <figure className={className}>
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
