import {
  classNames,
  h,
  useRef,
  useState,
  createForgeStyle,
  type ClassValue,
  type CSSStyleProperties,
  type MpChild,
  type MpElement,
} from '@mission-platform/forge';

import styles from './forge-typography.module.scss';

import type { SizeScale } from '@mission-platform/tokens';

/** Optional size token — canonical 2xs → 2xl scale (overrides the variant's font-size when set). */
export type TypographySize = SizeScale;

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

/** Component-owned CSS values inherited by typography descendants and popup content. */

/** Neutral style map for the supported typography custom properties. */

/* ── Visual property overrides (generated) ───────────────────────────── */
/** Component-owned CSS values inherited by typography descendants and popup content. */
export interface TypographyStyleProperties {
  readonly 'base-line-height'?: string;
  readonly 'color-critical'?: string;
  readonly 'color-disabled'?: string;
  readonly 'color-error'?: string;
  readonly 'color-info'?: string;
  readonly 'color-inverse'?: string;
  readonly 'color-link'?: string;
  readonly 'color-link-hover'?: string;
  readonly 'color-link-visited'?: string;
  readonly 'color-neutral'?: string;
  readonly 'color-primary'?: string;
  readonly 'color-secondary'?: string;
  readonly 'color-success'?: string;
  readonly 'color-tertiary'?: string;
  readonly 'color-warning'?: string;
  readonly 'display-font-family'?: string;
  readonly 'display-font-size'?: string;
  readonly 'display-margin-bottom'?: string;
  readonly 'font-family'?: string;
  readonly 'link-focus-ring'?: string;
  readonly 'link-radius'?: string;
  readonly 'link-transition-duration'?: string;
  readonly 'link-transition-easing'?: string;
  readonly 'override-font-weight-bold'?: string;
  readonly 'override-font-weight-medium'?: string;
  readonly 'override-font-weight-regular'?: string;
  readonly 'override-font-weight-semibold'?: string;
  readonly 'override-line-height-loose'?: string;
  readonly 'override-line-height-normal'?: string;
  readonly 'override-line-height-relaxed'?: string;
  readonly 'override-line-height-snug'?: string;
  readonly 'override-line-height-tight'?: string;
  readonly 'popup-border'?: string;
  readonly 'popup-border-width'?: string;
  readonly 'popup-font-family'?: string;
  readonly 'popup-font-size'?: string;
  readonly 'popup-font-weight'?: string;
  readonly 'popup-letter-spacing'?: string;
  readonly 'popup-line-height'?: string;
  readonly 'popup-margin-top'?: string;
  readonly 'popup-max-width'?: string;
  readonly 'popup-padding-block'?: string;
  readonly 'popup-padding-inline'?: string;
  readonly 'popup-radius'?: string;
  readonly 'popup-shadow'?: string;
  readonly 'popup-surface'?: string;
  readonly 'popup-text'?: string;
  readonly 'variant-body-lg-font-family'?: string;
  readonly 'variant-body-lg-font-size'?: string;
  readonly 'variant-body-lg-font-weight'?: string;
  readonly 'variant-body-lg-letter-spacing'?: string;
  readonly 'variant-body-lg-line-height'?: string;
  readonly 'variant-body-lg-margin-bottom'?: string;
  readonly 'variant-body-md-font-family'?: string;
  readonly 'variant-body-md-font-size'?: string;
  readonly 'variant-body-md-font-weight'?: string;
  readonly 'variant-body-md-letter-spacing'?: string;
  readonly 'variant-body-md-line-height'?: string;
  readonly 'variant-body-md-margin-bottom'?: string;
  readonly 'variant-body-sm-font-family'?: string;
  readonly 'variant-body-sm-font-size'?: string;
  readonly 'variant-body-sm-font-weight'?: string;
  readonly 'variant-body-sm-letter-spacing'?: string;
  readonly 'variant-body-sm-line-height'?: string;
  readonly 'variant-body-sm-margin-bottom'?: string;
  readonly 'variant-body-xs-font-family'?: string;
  readonly 'variant-body-xs-font-size'?: string;
  readonly 'variant-body-xs-font-weight'?: string;
  readonly 'variant-body-xs-letter-spacing'?: string;
  readonly 'variant-body-xs-line-height'?: string;
  readonly 'variant-body-xs-margin-bottom'?: string;
  readonly 'variant-caption-font-family'?: string;
  readonly 'variant-caption-font-size'?: string;
  readonly 'variant-caption-font-weight'?: string;
  readonly 'variant-caption-letter-spacing'?: string;
  readonly 'variant-caption-line-height'?: string;
  readonly 'variant-code-font-family'?: string;
  readonly 'variant-code-font-size'?: string;
  readonly 'variant-code-font-weight'?: string;
  readonly 'variant-code-letter-spacing'?: string;
  readonly 'variant-code-line-height'?: string;
  readonly 'variant-display-font-weight'?: string;
  readonly 'variant-display-letter-spacing'?: string;
  readonly 'variant-display-line-height'?: string;
  readonly 'variant-h1-font-family'?: string;
  readonly 'variant-h1-font-size'?: string;
  readonly 'variant-h1-font-weight'?: string;
  readonly 'variant-h1-letter-spacing'?: string;
  readonly 'variant-h1-line-height'?: string;
  readonly 'variant-h1-margin-bottom'?: string;
  readonly 'variant-h2-font-family'?: string;
  readonly 'variant-h2-font-size'?: string;
  readonly 'variant-h2-font-weight'?: string;
  readonly 'variant-h2-letter-spacing'?: string;
  readonly 'variant-h2-line-height'?: string;
  readonly 'variant-h2-margin-bottom'?: string;
  readonly 'variant-h3-font-family'?: string;
  readonly 'variant-h3-font-size'?: string;
  readonly 'variant-h3-font-weight'?: string;
  readonly 'variant-h3-letter-spacing'?: string;
  readonly 'variant-h3-line-height'?: string;
  readonly 'variant-h3-margin-bottom'?: string;
  readonly 'variant-h4-font-family'?: string;
  readonly 'variant-h4-font-size'?: string;
  readonly 'variant-h4-font-weight'?: string;
  readonly 'variant-h4-letter-spacing'?: string;
  readonly 'variant-h4-line-height'?: string;
  readonly 'variant-h4-margin-bottom'?: string;
  readonly 'variant-h5-font-family'?: string;
  readonly 'variant-h5-font-size'?: string;
  readonly 'variant-h5-font-weight'?: string;
  readonly 'variant-h5-letter-spacing'?: string;
  readonly 'variant-h5-line-height'?: string;
  readonly 'variant-h5-margin-bottom'?: string;
  readonly 'variant-h6-font-family'?: string;
  readonly 'variant-h6-font-size'?: string;
  readonly 'variant-h6-font-weight'?: string;
  readonly 'variant-h6-letter-spacing'?: string;
  readonly 'variant-h6-line-height'?: string;
  readonly 'variant-h6-margin-bottom'?: string;
  readonly 'variant-label-font-family'?: string;
  readonly 'variant-label-font-size'?: string;
  readonly 'variant-label-font-weight'?: string;
  readonly 'variant-label-letter-spacing'?: string;
  readonly 'variant-label-line-height'?: string;
}

export type TypographyStyle = CSSStyleProperties & {
  readonly '--forge-typography-base-line-height'?: string | undefined;
  readonly '--forge-typography-color-critical'?: string | undefined;
  readonly '--forge-typography-color-disabled'?: string | undefined;
  readonly '--forge-typography-color-error'?: string | undefined;
  readonly '--forge-typography-color-info'?: string | undefined;
  readonly '--forge-typography-color-inverse'?: string | undefined;
  readonly '--forge-typography-color-link'?: string | undefined;
  readonly '--forge-typography-color-link-hover'?: string | undefined;
  readonly '--forge-typography-color-link-visited'?: string | undefined;
  readonly '--forge-typography-color-neutral'?: string | undefined;
  readonly '--forge-typography-color-primary'?: string | undefined;
  readonly '--forge-typography-color-secondary'?: string | undefined;
  readonly '--forge-typography-color-success'?: string | undefined;
  readonly '--forge-typography-color-tertiary'?: string | undefined;
  readonly '--forge-typography-color-warning'?: string | undefined;
  readonly '--forge-typography-display-font-family'?: string | undefined;
  readonly '--forge-typography-display-font-size'?: string | undefined;
  readonly '--forge-typography-display-margin-bottom'?: string | undefined;
  readonly '--forge-typography-font-family'?: string | undefined;
  readonly '--forge-typography-link-focus-ring'?: string | undefined;
  readonly '--forge-typography-link-radius'?: string | undefined;
  readonly '--forge-typography-link-transition-duration'?: string | undefined;
  readonly '--forge-typography-link-transition-easing'?: string | undefined;
  readonly '--forge-typography-override-font-weight-bold'?: string | undefined;
  readonly '--forge-typography-override-font-weight-medium'?: string | undefined;
  readonly '--forge-typography-override-font-weight-regular'?: string | undefined;
  readonly '--forge-typography-override-font-weight-semibold'?: string | undefined;
  readonly '--forge-typography-override-line-height-loose'?: string | undefined;
  readonly '--forge-typography-override-line-height-normal'?: string | undefined;
  readonly '--forge-typography-override-line-height-relaxed'?: string | undefined;
  readonly '--forge-typography-override-line-height-snug'?: string | undefined;
  readonly '--forge-typography-override-line-height-tight'?: string | undefined;
  readonly '--forge-typography-popup-border'?: string | undefined;
  readonly '--forge-typography-popup-border-width'?: string | undefined;
  readonly '--forge-typography-popup-font-family'?: string | undefined;
  readonly '--forge-typography-popup-font-size'?: string | undefined;
  readonly '--forge-typography-popup-font-weight'?: string | undefined;
  readonly '--forge-typography-popup-letter-spacing'?: string | undefined;
  readonly '--forge-typography-popup-line-height'?: string | undefined;
  readonly '--forge-typography-popup-margin-top'?: string | undefined;
  readonly '--forge-typography-popup-max-width'?: string | undefined;
  readonly '--forge-typography-popup-padding-block'?: string | undefined;
  readonly '--forge-typography-popup-padding-inline'?: string | undefined;
  readonly '--forge-typography-popup-radius'?: string | undefined;
  readonly '--forge-typography-popup-shadow'?: string | undefined;
  readonly '--forge-typography-popup-surface'?: string | undefined;
  readonly '--forge-typography-popup-text'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-font-family'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-font-size'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-line-height'?: string | undefined;
  readonly '--forge-typography-variant-body-lg-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-body-md-font-family'?: string | undefined;
  readonly '--forge-typography-variant-body-md-font-size'?: string | undefined;
  readonly '--forge-typography-variant-body-md-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-body-md-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-body-md-line-height'?: string | undefined;
  readonly '--forge-typography-variant-body-md-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-font-family'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-font-size'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-line-height'?: string | undefined;
  readonly '--forge-typography-variant-body-sm-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-font-family'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-font-size'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-line-height'?: string | undefined;
  readonly '--forge-typography-variant-body-xs-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-caption-font-family'?: string | undefined;
  readonly '--forge-typography-variant-caption-font-size'?: string | undefined;
  readonly '--forge-typography-variant-caption-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-caption-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-caption-line-height'?: string | undefined;
  readonly '--forge-typography-variant-code-font-family'?: string | undefined;
  readonly '--forge-typography-variant-code-font-size'?: string | undefined;
  readonly '--forge-typography-variant-code-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-code-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-code-line-height'?: string | undefined;
  readonly '--forge-typography-variant-display-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-display-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-display-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h1-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h1-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h1-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h1-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h1-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h1-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-h2-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h2-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h2-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h2-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h2-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h2-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-h3-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h3-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h3-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h3-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h3-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h3-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-h4-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h4-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h4-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h4-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h4-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h4-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-h5-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h5-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h5-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h5-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h5-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h5-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-h6-font-family'?: string | undefined;
  readonly '--forge-typography-variant-h6-font-size'?: string | undefined;
  readonly '--forge-typography-variant-h6-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-h6-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-h6-line-height'?: string | undefined;
  readonly '--forge-typography-variant-h6-margin-bottom'?: string | undefined;
  readonly '--forge-typography-variant-label-font-family'?: string | undefined;
  readonly '--forge-typography-variant-label-font-size'?: string | undefined;
  readonly '--forge-typography-variant-label-font-weight'?: string | undefined;
  readonly '--forge-typography-variant-label-letter-spacing'?: string | undefined;
  readonly '--forge-typography-variant-label-line-height'?: string | undefined;
};

function createTypographyStyle(
  properties: Readonly<TypographyStyleProperties> | undefined,
): TypographyStyle | undefined {
  return createForgeStyle({
    '--forge-typography-base-line-height': properties?.['base-line-height'],
    '--forge-typography-color-critical': properties?.['color-critical'],
    '--forge-typography-color-disabled': properties?.['color-disabled'],
    '--forge-typography-color-error': properties?.['color-error'],
    '--forge-typography-color-info': properties?.['color-info'],
    '--forge-typography-color-inverse': properties?.['color-inverse'],
    '--forge-typography-color-link': properties?.['color-link'],
    '--forge-typography-color-link-hover': properties?.['color-link-hover'],
    '--forge-typography-color-link-visited': properties?.['color-link-visited'],
    '--forge-typography-color-neutral': properties?.['color-neutral'],
    '--forge-typography-color-primary': properties?.['color-primary'],
    '--forge-typography-color-secondary': properties?.['color-secondary'],
    '--forge-typography-color-success': properties?.['color-success'],
    '--forge-typography-color-tertiary': properties?.['color-tertiary'],
    '--forge-typography-color-warning': properties?.['color-warning'],
    '--forge-typography-display-font-family': properties?.['display-font-family'],
    '--forge-typography-display-font-size': properties?.['display-font-size'],
    '--forge-typography-display-margin-bottom': properties?.['display-margin-bottom'],
    '--forge-typography-font-family': properties?.['font-family'],
    '--forge-typography-link-focus-ring': properties?.['link-focus-ring'],
    '--forge-typography-link-radius': properties?.['link-radius'],
    '--forge-typography-link-transition-duration': properties?.['link-transition-duration'],
    '--forge-typography-link-transition-easing': properties?.['link-transition-easing'],
    '--forge-typography-override-font-weight-bold': properties?.['override-font-weight-bold'],
    '--forge-typography-override-font-weight-medium': properties?.['override-font-weight-medium'],
    '--forge-typography-override-font-weight-regular': properties?.['override-font-weight-regular'],
    '--forge-typography-override-font-weight-semibold': properties?.['override-font-weight-semibold'],
    '--forge-typography-override-line-height-loose': properties?.['override-line-height-loose'],
    '--forge-typography-override-line-height-normal': properties?.['override-line-height-normal'],
    '--forge-typography-override-line-height-relaxed': properties?.['override-line-height-relaxed'],
    '--forge-typography-override-line-height-snug': properties?.['override-line-height-snug'],
    '--forge-typography-override-line-height-tight': properties?.['override-line-height-tight'],
    '--forge-typography-popup-border': properties?.['popup-border'],
    '--forge-typography-popup-border-width': properties?.['popup-border-width'],
    '--forge-typography-popup-font-family': properties?.['popup-font-family'],
    '--forge-typography-popup-font-size': properties?.['popup-font-size'],
    '--forge-typography-popup-font-weight': properties?.['popup-font-weight'],
    '--forge-typography-popup-letter-spacing': properties?.['popup-letter-spacing'],
    '--forge-typography-popup-line-height': properties?.['popup-line-height'],
    '--forge-typography-popup-margin-top': properties?.['popup-margin-top'],
    '--forge-typography-popup-max-width': properties?.['popup-max-width'],
    '--forge-typography-popup-padding-block': properties?.['popup-padding-block'],
    '--forge-typography-popup-padding-inline': properties?.['popup-padding-inline'],
    '--forge-typography-popup-radius': properties?.['popup-radius'],
    '--forge-typography-popup-shadow': properties?.['popup-shadow'],
    '--forge-typography-popup-surface': properties?.['popup-surface'],
    '--forge-typography-popup-text': properties?.['popup-text'],
    '--forge-typography-variant-body-lg-font-family': properties?.['variant-body-lg-font-family'],
    '--forge-typography-variant-body-lg-font-size': properties?.['variant-body-lg-font-size'],
    '--forge-typography-variant-body-lg-font-weight': properties?.['variant-body-lg-font-weight'],
    '--forge-typography-variant-body-lg-letter-spacing': properties?.['variant-body-lg-letter-spacing'],
    '--forge-typography-variant-body-lg-line-height': properties?.['variant-body-lg-line-height'],
    '--forge-typography-variant-body-lg-margin-bottom': properties?.['variant-body-lg-margin-bottom'],
    '--forge-typography-variant-body-md-font-family': properties?.['variant-body-md-font-family'],
    '--forge-typography-variant-body-md-font-size': properties?.['variant-body-md-font-size'],
    '--forge-typography-variant-body-md-font-weight': properties?.['variant-body-md-font-weight'],
    '--forge-typography-variant-body-md-letter-spacing': properties?.['variant-body-md-letter-spacing'],
    '--forge-typography-variant-body-md-line-height': properties?.['variant-body-md-line-height'],
    '--forge-typography-variant-body-md-margin-bottom': properties?.['variant-body-md-margin-bottom'],
    '--forge-typography-variant-body-sm-font-family': properties?.['variant-body-sm-font-family'],
    '--forge-typography-variant-body-sm-font-size': properties?.['variant-body-sm-font-size'],
    '--forge-typography-variant-body-sm-font-weight': properties?.['variant-body-sm-font-weight'],
    '--forge-typography-variant-body-sm-letter-spacing': properties?.['variant-body-sm-letter-spacing'],
    '--forge-typography-variant-body-sm-line-height': properties?.['variant-body-sm-line-height'],
    '--forge-typography-variant-body-sm-margin-bottom': properties?.['variant-body-sm-margin-bottom'],
    '--forge-typography-variant-body-xs-font-family': properties?.['variant-body-xs-font-family'],
    '--forge-typography-variant-body-xs-font-size': properties?.['variant-body-xs-font-size'],
    '--forge-typography-variant-body-xs-font-weight': properties?.['variant-body-xs-font-weight'],
    '--forge-typography-variant-body-xs-letter-spacing': properties?.['variant-body-xs-letter-spacing'],
    '--forge-typography-variant-body-xs-line-height': properties?.['variant-body-xs-line-height'],
    '--forge-typography-variant-body-xs-margin-bottom': properties?.['variant-body-xs-margin-bottom'],
    '--forge-typography-variant-caption-font-family': properties?.['variant-caption-font-family'],
    '--forge-typography-variant-caption-font-size': properties?.['variant-caption-font-size'],
    '--forge-typography-variant-caption-font-weight': properties?.['variant-caption-font-weight'],
    '--forge-typography-variant-caption-letter-spacing': properties?.['variant-caption-letter-spacing'],
    '--forge-typography-variant-caption-line-height': properties?.['variant-caption-line-height'],
    '--forge-typography-variant-code-font-family': properties?.['variant-code-font-family'],
    '--forge-typography-variant-code-font-size': properties?.['variant-code-font-size'],
    '--forge-typography-variant-code-font-weight': properties?.['variant-code-font-weight'],
    '--forge-typography-variant-code-letter-spacing': properties?.['variant-code-letter-spacing'],
    '--forge-typography-variant-code-line-height': properties?.['variant-code-line-height'],
    '--forge-typography-variant-display-font-weight': properties?.['variant-display-font-weight'],
    '--forge-typography-variant-display-letter-spacing': properties?.['variant-display-letter-spacing'],
    '--forge-typography-variant-display-line-height': properties?.['variant-display-line-height'],
    '--forge-typography-variant-h1-font-family': properties?.['variant-h1-font-family'],
    '--forge-typography-variant-h1-font-size': properties?.['variant-h1-font-size'],
    '--forge-typography-variant-h1-font-weight': properties?.['variant-h1-font-weight'],
    '--forge-typography-variant-h1-letter-spacing': properties?.['variant-h1-letter-spacing'],
    '--forge-typography-variant-h1-line-height': properties?.['variant-h1-line-height'],
    '--forge-typography-variant-h1-margin-bottom': properties?.['variant-h1-margin-bottom'],
    '--forge-typography-variant-h2-font-family': properties?.['variant-h2-font-family'],
    '--forge-typography-variant-h2-font-size': properties?.['variant-h2-font-size'],
    '--forge-typography-variant-h2-font-weight': properties?.['variant-h2-font-weight'],
    '--forge-typography-variant-h2-letter-spacing': properties?.['variant-h2-letter-spacing'],
    '--forge-typography-variant-h2-line-height': properties?.['variant-h2-line-height'],
    '--forge-typography-variant-h2-margin-bottom': properties?.['variant-h2-margin-bottom'],
    '--forge-typography-variant-h3-font-family': properties?.['variant-h3-font-family'],
    '--forge-typography-variant-h3-font-size': properties?.['variant-h3-font-size'],
    '--forge-typography-variant-h3-font-weight': properties?.['variant-h3-font-weight'],
    '--forge-typography-variant-h3-letter-spacing': properties?.['variant-h3-letter-spacing'],
    '--forge-typography-variant-h3-line-height': properties?.['variant-h3-line-height'],
    '--forge-typography-variant-h3-margin-bottom': properties?.['variant-h3-margin-bottom'],
    '--forge-typography-variant-h4-font-family': properties?.['variant-h4-font-family'],
    '--forge-typography-variant-h4-font-size': properties?.['variant-h4-font-size'],
    '--forge-typography-variant-h4-font-weight': properties?.['variant-h4-font-weight'],
    '--forge-typography-variant-h4-letter-spacing': properties?.['variant-h4-letter-spacing'],
    '--forge-typography-variant-h4-line-height': properties?.['variant-h4-line-height'],
    '--forge-typography-variant-h4-margin-bottom': properties?.['variant-h4-margin-bottom'],
    '--forge-typography-variant-h5-font-family': properties?.['variant-h5-font-family'],
    '--forge-typography-variant-h5-font-size': properties?.['variant-h5-font-size'],
    '--forge-typography-variant-h5-font-weight': properties?.['variant-h5-font-weight'],
    '--forge-typography-variant-h5-letter-spacing': properties?.['variant-h5-letter-spacing'],
    '--forge-typography-variant-h5-line-height': properties?.['variant-h5-line-height'],
    '--forge-typography-variant-h5-margin-bottom': properties?.['variant-h5-margin-bottom'],
    '--forge-typography-variant-h6-font-family': properties?.['variant-h6-font-family'],
    '--forge-typography-variant-h6-font-size': properties?.['variant-h6-font-size'],
    '--forge-typography-variant-h6-font-weight': properties?.['variant-h6-font-weight'],
    '--forge-typography-variant-h6-letter-spacing': properties?.['variant-h6-letter-spacing'],
    '--forge-typography-variant-h6-line-height': properties?.['variant-h6-line-height'],
    '--forge-typography-variant-h6-margin-bottom': properties?.['variant-h6-margin-bottom'],
    '--forge-typography-variant-label-font-family': properties?.['variant-label-font-family'],
    '--forge-typography-variant-label-font-size': properties?.['variant-label-font-size'],
    '--forge-typography-variant-label-font-weight': properties?.['variant-label-font-weight'],
    '--forge-typography-variant-label-letter-spacing': properties?.['variant-label-letter-spacing'],
    '--forge-typography-variant-label-line-height': properties?.['variant-label-line-height'],
  }) as TypographyStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
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
  /** When a link draws its underline. Defaults to `'always'`. */
  underline?: TypographyUnderline;
  properties?: Readonly<TypographyStyleProperties>;
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
  label: 'p',
  caption: 'p',
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
 * and the chosen `underline` mode (`'always'` by default); `target="_blank"` gets
 * `rel="noopener noreferrer"` automatically. It owns its
 * styling through the co-located CSS Module `forge-typography.module.scss`
 * (carried onto every framework by the two-stage compiler, so the component
 * ships its own `@layer mp.typography` CSS); the hashed class names are
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
    underline = 'always',
  } = properties;
  const style = createTypographyStyle(properties.properties);

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
    size ? `forge-size--${size}` : undefined,
    { [styles['forge-typography--truncate']]: truncate || truncatePopup },
    // The caller's own class(es) come last so they win the cascade.
    properties.className,
  );

  if (!truncatePopup) {
    return h(
      tag,
      {
        className,
        href,
        target,
        rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined),
        style,
      },
      ...(Array.isArray(children) ? children : [children]),
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
    <span
      className={styles['forge-typography-popup-wrapper']}
      style={style}
    >
      {h(
        tag,
        {
          style,
          ref: textReference,
          className: classNames(className, styles['forge-typography--popup-anchor']),
          href,
          target,
          rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined),
          onMouseenter: showPopup,
          onMouseleave: hidePopup,
          onFocusin: showPopup,
          onFocusout: hidePopup,
        },
        ...(Array.isArray(children) ? children : [children]),
      )}
      {popupVisible ? (
        <span
          className={styles['forge-typography-popup']}
          role="tooltip"
          style={style}
        >
          {children}
        </span>
      ) : undefined}
    </span>
  );
}
