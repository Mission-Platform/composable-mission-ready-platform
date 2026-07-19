import { classNames, h, useRef, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';

import sizeStyles from '../size.module.scss';

import styles from './base-typography.module.scss';

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
  | 'code';

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

/** Vertical alignment of the (inline) text box (maps to CSS `vertical-align`). */
export type TypographyVerticalAlign =
  'baseline' | 'top' | 'middle' | 'bottom' | 'sub' | 'super' | 'text-top' | 'text-bottom';

export interface TypographyProperties extends MpProperties {
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
};

/**
 * `BaseTypography` — the text-styling primitive authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders its default-slot content in the semantic tag for the chosen
 * `variant` (overridable with `as`), applying the variant's type-scale plus the
 * optional `weight`, `color`, `horizontalAlign`, `verticalAlign`, and `truncate` modifiers. It owns its
 * styling through the co-located CSS Module `base-typography.module.scss`
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
export function BaseTypography(properties: Readonly<TypographyProperties>): MpElement {
  const {
    variant = 'body-md',
    as,
    weight,
    lineHeight,
    color = 'primary',
    horizontalAlign,
    verticalAlign,
    truncate = false,
    truncatePopup = false,
    size,
  } = properties;

  const tag = as ?? TAG_MAP[variant];

  // Hooks are called unconditionally (rules of hooks); they are only used by the
  // `truncatePopup` branch below.
  const textReference = useRef<HTMLElement | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Children must reach `h` as variadic args (the compile-time runtimes read
  // `...children`, not `properties.children`), so normalise the slot first.
  const children = properties.children;
  const childList = children === undefined ? [] : Array.isArray(children) ? [...children] : [children];

  const className = classNames(
    styles['base-typography'],
    styles[`base-typography--${variant}`],
    weight ? styles[`base-typography--weight-${weight}`] : undefined,
    color === 'inherit' ? undefined : styles[`base-typography--color-${color}`],
    horizontalAlign ? styles[`base-typography--halign-${horizontalAlign}`] : undefined,
    verticalAlign ? styles[`base-typography--valign-${verticalAlign}`] : undefined,
    // Optional leading override → a `--mp-line-height-*` token class that wins
    // over the variant's default leading.
    lineHeight ? styles[`base-typography--lh-${lineHeight}`] : undefined,
    // Optional size override → the shared `--mp-size-font-*` font-size class.
    size ? sizeStyles[`base-size--${size}`] : undefined,
    { [styles['base-typography--truncate']]: truncate || truncatePopup },
  );

  if (!truncatePopup) {
    return h(tag, { class: className }, ...childList);
  }

  const showPopup = (): void => {
    const element = textReference.current;
    if (element !== null && element.scrollWidth > element.clientWidth) {
      setPopupVisible(true);
    }
  };
  const hidePopup = (): void => setPopupVisible(false);

  return (
    <span classNames={styles['base-typography-popup-wrapper']}>
      {h(
        tag,
        {
          ref: textReference,
          class: classNames(className, styles['base-typography--popup-anchor']),
          onMouseenter: showPopup,
          onMouseleave: hidePopup,
          onFocusin: showPopup,
          onFocusout: hidePopup,
        },
        ...childList,
      )}
      {popupVisible ? (
        <span
          classNames={styles['base-typography-popup']}
          role="tooltip"
        >
          {childList}
        </span>
      ) : undefined}
    </span>
  );
}
