import {
  type ClassValue,
  classNames,
  Dynamic,
  h,
  type MpChild,
  type MpElement,
  useRef,
  useState,
} from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './forge-typography.module.scss';

/** Optional size token — canonical 2xs → 2xl scale (overrides the variant's font-size when set). */
export type TypographySize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** The semantic/visual type-scale step the text is rendered at. */
export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'body-xs'
  | 'label'
  | 'caption'
  | 'code'
  /** Standalone link text: renders an `<a>` at the body scale with link styling. */
  | 'link';

/** Font-weight override applied on top of the variant's default weight. */
export type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Line-height (leading) override, mapped to a `--mp-line-height-*` design token. */
export type TypographyLineHeight = 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';

/**
 * Text colour. The structural tokens (`primary`/`secondary`/`tertiary`/
 * `disabled`/`inverse`) map to `--mp-color-text-*`; the canonical semantic tones
 * (`neutral`/`success`/`warning`/`info`/`error`/`critical`) map to the matching
 * `--mp-color-<family>-text` token; `inherit` applies none.
 */
export type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'inverse'
  | 'inherit'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'
  | 'critical';

/** Horizontal text alignment (maps to CSS `text-align`). */
export type TypographyHorizontalAlign = 'start' | 'center' | 'end';

/** When a link draws its underline. */
export type TypographyUnderline = 'always' | 'hover' | 'none';

/** Browsing context a link opens in. */
export type TypographyTarget = '_self' | '_blank' | '_parent' | '_top';

/** Vertical alignment of the (inline) text box (maps to CSS `vertical-align`). */
export type TypographyVerticalAlign =
  'baseline' | 'top' | 'middle' | 'bottom' | 'sub' | 'super' | 'text-top' | 'text-bottom';

export interface TypographyProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Extra class(es) merged onto the rendered element. */
  className?: ClassValue;
  /** The type-scale variant. Defaults to `'body-md'`. */
  variant?: TypographyVariant;
  /**
   * Optional size token (canonical `2xs → 2xl` scale). When set, overrides the
   * variant's font-size with the matching `--mp-size-font-*` token; left unset
   * by default so the `variant` scale is preserved.
   */
  size?: TypographySize;
  /** Override the rendered HTML tag (defaults to the variant's semantic tag). */
  as?: string;
  /** Font-weight override. */
  weight?: TypographyWeight;
  /**
   * Line-height (leading) override, mapped to a `--mp-line-height-*` design
   * token. Overrides the variant's default leading when set.
   */
  lineHeight?: TypographyLineHeight;
  /** Text colour token. Defaults to `'primary'`. */
  color?: TypographyColor;
  /** Horizontal alignment (maps to CSS `text-align`). */
  horizontalAlign?: TypographyHorizontalAlign;
  /** Vertical alignment of the inline text box (maps to CSS `vertical-align`). */
  verticalAlign?: TypographyVerticalAlign;
  /** Truncate overflowing text with an ellipsis on a single line. */
  truncate?: boolean;
  /**
   * When the (single-line) text is truncated, reveal the full text in a
   * floating popup on hover/focus. Implies single-line truncation.
   */
  truncatePopup?: boolean;
  /**
   * Link target. Setting it renders an `<a>` and applies link styling on top of
   * the chosen `variant`, so a heading or a caption can be a link without
   * leaving its own type scale.
   */
  href?: string;
  /** Browsing context the link opens in. */
  target?: TypographyTarget;
  /**
   * `rel` for the link. Defaults to `'noopener noreferrer'` when `target` is
   * `'_blank'`, so an external link never hands the opener over.
   */
  rel?: string;
  /** When a link draws its underline. Defaults to `'hover'`. */
  underline?: TypographyUnderline;
}

/** Maps each {@link TypographyVariant} onto the semantic HTML tag it renders as. */
const TAG_MAP: Record<TypographyVariant, string> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  'body-lg': 'p',
  'body-md': 'p',
  'body-sm': 'p',
  'body-xs': 'p',
  label: 'span',
  caption: 'span',
  code: 'code',
  link: 'a',
};

/**
 * `ForgeTypography` — the text-styling primitive authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders its default-slot content in the semantic tag for the chosen
 * `variant` (overridable with `as`), applying the variant's type-scale plus the
 * optional `weight`, `color`, `horizontalAlign`, `verticalAlign`, and `truncate` modifiers.
 *
 * Links come from here too, two ways: `variant="link"` for standalone link text,
 * and `href` on **any** variant so a heading or caption can be a link without
 * leaving its own type scale. Either way the element renders as an `<a>` with the
 * link colour, its hover/active and `:visited` treatment, a visible focus ring
 * and the chosen `underline` mode (`'hover'` by default); `target="_blank"` gets
 * `rel="noopener noreferrer"` automatically. It owns its
 * styling through the co-located CSS Module `forge-typography.module.scss`
 * (carried onto every framework by the two-stage compiler, so the component
 * ships its own `@layer mp.components` CSS); the hashed class names are
 * assembled with the framework-neutral {@link classNames} helper.
 *
 * The original Vue SFC's `@floating-ui` truncate-popup is restored here through
 * the `truncatePopup` prop: when on, the truncated text becomes the anchor for a
 * floating `role="tooltip"` popup (revealed on hover/focus only when the text
 * actually overflows), positioned with **CSS Anchor Positioning** instead of
 * `@floating-ui`, and driven by the neutral `useRef`/`useState` hooks.
 */
export function ForgeTypography(properties: Readonly<TypographyProperties>): MpElement {
  const {
    variant = 'body-md',
    as,
    weight,
    lineHeight,
    horizontalAlign,
    verticalAlign,
    truncate = false,
    truncatePopup = false,
    size,
    href,
    target,
    rel,
    underline = 'hover',
  } = properties;

  // A link is either declared through the variant (standalone link text) or
  // implied by `href` on any other variant (a heading or caption that links).
  const isLink = href !== undefined || variant === 'link';
  const tag = as ?? (href === undefined ? TAG_MAP[variant] : 'a');
  // `variant="link"` carries no scale of its own — it borrows the body scale — so
  // that the link treatment is purely colour/decoration and never fights the
  // host variant's type scale when `href` is used on, say, an `h3`.
  const scaleVariant = variant === 'link' ? 'body-md' : variant;
  // The link colour comes from the `--link` class, so it must not be shadowed by
  // the default `primary` colour class; an explicit `color` still wins.
  const color = properties.color ?? (isLink ? 'inherit' : 'primary');
  // An external link must never hand its opener over.
  const resolvedRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined);

  // Hooks are called unconditionally (rules of hooks); they are only used by the
  // `truncatePopup` branch below.
  const textReference = useRef<HTMLElement | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const children = properties.children;

  const className = classNames(
    styles['forge-typography'],
    styles[`forge-typography--${scaleVariant}`],
    isLink ? styles['forge-typography--link'] : undefined,
    isLink ? styles[`forge-typography--underline-${underline}`] : undefined,
    weight ? styles[`forge-typography--weight-${weight}`] : undefined,
    color === 'inherit' ? undefined : styles[`forge-typography--color-${color}`],
    horizontalAlign ? styles[`forge-typography--halign-${horizontalAlign}`] : undefined,
    verticalAlign ? styles[`forge-typography--valign-${verticalAlign}`] : undefined,
    // Optional leading override → a `--mp-line-height-*` token class that wins
    // over the variant's default leading.
    lineHeight ? styles[`forge-typography--lh-${lineHeight}`] : undefined,
    // Optional size override → the shared `--mp-size-font-*` font-size class.
    size ? sizeStyles[`forge-size--${size}`] : undefined,
    { [styles['forge-typography--truncate']]: truncate || truncatePopup },
    // The caller's own class(es) come last so they win the cascade.
    properties.className,
  );

  if (!truncatePopup) {
    return (
      <Dynamic
        is={tag}
        className={className}
        href={href}
        target={target}
        rel={resolvedRel}
      >
        {children}
      </Dynamic>
    );
  }

  const showPopup = (): void => {
    const element = textReference.current;
    if (element !== null && element.scrollWidth > element.clientWidth) {
      setPopupVisible(true);
    }
  };
  const hidePopup = (): void => setPopupVisible(false);

  return (
    <span className={styles['forge-typography-popup-wrapper']}>
      <Dynamic
        is={tag}
        ref={textReference}
        className={classNames(className, styles['forge-typography--popup-anchor'])}
        href={href}
        target={target}
        rel={resolvedRel}
        onMouseenter={showPopup}
        onMouseleave={hidePopup}
        onFocusin={showPopup}
        onFocusout={hidePopup}
      >
        {children}
      </Dynamic>
      {popupVisible ? (
        <span
          className={styles['forge-typography-popup']}
          role="tooltip"
        >
          {children}
        </span>
      ) : undefined}
    </span>
  );
}
