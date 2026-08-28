import { validateUrl } from '@mission-platform/email-renderer';
import { Dynamic } from '@mission-platform/forge';

import { colorValue, typographyStyle } from '@/tokens';

import type { EmailColor, EmailTypographyVariant } from '@/tokens';
import type { MpChild, MpElement } from '@mission-platform/forge';

/** The elements the email type scale may be rendered as. */
export type EmailTypographyTag = 'p' | 'span' | 'div' | 'a' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** Heading tags carry their own type scale, so `as` alone selects the variant. */
const HEADING_SCALES: Partial<Record<EmailTypographyTag, EmailTypographyVariant>> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
};

export interface EmailTypographyProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Rendered element. Defaults to `'p'`, or `'a'` when `href` is set. */
  readonly as?: EmailTypographyTag;
  /** Type-scale variant. Defaults to the heading tag when `as` is `h1`–`h6`, else `'body-md'`. */
  readonly variant?: EmailTypographyVariant;
  readonly color?: EmailColor;
  readonly align?: 'left' | 'center' | 'right';
  /** Renders an `<a>` with link styling; validated through the existing `validateUrl`. */
  readonly href?: string;
  readonly target?: '_self' | '_blank';
  /** Defaults to `'always'` for links — email clients strip hover states. */
  readonly underline?: 'always' | 'none';
}

/**
 * The single email text atom, mirroring the `ForgeTypography` vocabulary: body
 * copy, headings, and links all come from one tokenized type scale resolved to
 * literal inline declarations, because email clients ignore CSS classes.
 */
export function EmailTypography(properties: Readonly<EmailTypographyProperties>): MpElement {
  const href = properties.href === undefined ? undefined : validateUrl(properties.href, 'href');
  const isLink = href !== undefined;
  const Tag = properties.as ?? (isLink ? 'a' : 'p');
  const variant = properties.variant ?? HEADING_SCALES[Tag] ?? 'body-md';
  const underline = properties.underline ?? 'always';

  return (
    <Dynamic
      is={Tag}
      align={properties.align}
      href={href}
      target={properties.target}
      rel={properties.target === '_blank' ? 'noopener noreferrer' : undefined}
      style={{
        ...typographyStyle(variant),
        color: colorValue(properties.color ?? (isLink ? 'primary.text' : 'text.primary')),
        margin: isLink ? undefined : 0,
        textDecoration: isLink && underline === 'always' ? 'underline' : undefined,
      }}
    >
      {properties.children ?? href}
    </Dynamic>
  );
}
