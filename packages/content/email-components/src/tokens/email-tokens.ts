import { borderWidth, radius, size, spacing, themeLight, typography } from '@mission-platform/tokens';

import type { EmailStyle, EmailStyleValue, EmailStyleValueWithFallback } from '@mission-platform/email-renderer';

export type EmailTypographyVariant = keyof typeof typography;
export type EmailSpacingScale = keyof typeof spacing;
export type EmailRadiusScale = keyof typeof radius;
export type EmailSizeScale = keyof typeof size.font;
export type EmailControlVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical' | 'ghost';
export type EmailColor =
  | 'text.primary'
  | 'text.secondary'
  | 'text.tertiary'
  | 'text.inverse'
  | 'text.on-primary'
  | 'bg.base'
  | 'bg.surface'
  | 'bg.raised'
  | 'bg.muted'
  | 'border.default'
  | 'border.strong'
  | 'primary.default'
  | 'primary.text'
  | 'secondary.default'
  | 'secondary.text'
  | 'default.default'
  | 'success.default'
  | 'success.text'
  | 'warning.default'
  | 'warning.text'
  | 'info.default'
  | 'info.text'
  | 'error.default'
  | 'error.text'
  | 'critical.default'
  | 'critical.text';

const colorTokens: Record<EmailColor, string> = {
  'text.primary': themeLight.color.text.primary,
  'text.secondary': themeLight.color.text.secondary,
  'text.tertiary': themeLight.color.text.tertiary,
  'text.inverse': themeLight.color.text.inverse,
  'text.on-primary': themeLight.color.text['on-primary'],
  'bg.base': themeLight.color.bg.base,
  'bg.surface': themeLight.color.bg.surface,
  'bg.raised': themeLight.color.bg.raised,
  'bg.muted': themeLight.color.bg.muted,
  'border.default': themeLight.color.border.default,
  'border.strong': themeLight.color.border.strong,
  'primary.default': themeLight.color.primary.default,
  'primary.text': themeLight.color.primary.text,
  'secondary.default': themeLight.color.secondary.default,
  'secondary.text': themeLight.color.secondary.text,
  'default.default': themeLight.color.default.default,
  'success.default': themeLight.color.success.default,
  'success.text': themeLight.color.success.text,
  'warning.default': themeLight.color.warning.default,
  'warning.text': themeLight.color.warning.text,
  'info.default': themeLight.color.info.default,
  'info.text': themeLight.color.info.text,
  'error.default': themeLight.color.error.default,
  'error.text': themeLight.color.error.text,
  'critical.default': themeLight.color.critical.default,
  'critical.text': themeLight.color.critical.text,
};

const colorFallbacks: Record<EmailColor, string> = {
  'text.primary': '#211f22',
  'text.secondary': '#514d52',
  'text.tertiary': '#696369',
  'text.inverse': '#ffffff',
  'text.on-primary': '#ffffff',
  'bg.base': '#f4f3f4',
  'bg.surface': '#ffffff',
  'bg.raised': '#ffffff',
  'bg.muted': '#e9e7e9',
  'border.default': '#5f535d',
  'border.strong': '#443b43',
  'primary.default': '#6c2fd4',
  'primary.text': '#5722b2',
  'secondary.default': '#514d52',
  'secondary.text': '#ffffff',
  'default.default': '#514d52',
  'success.default': '#287a55',
  'success.text': '#ffffff',
  'warning.default': '#9a5b00',
  'warning.text': '#ffffff',
  'info.default': '#216a8a',
  'info.text': '#ffffff',
  'error.default': '#a83b2a',
  'error.text': '#ffffff',
  'critical.default': '#7e3023',
  'critical.text': '#ffffff',
};

function tokenWithFallback(value: string, fallback: string): EmailStyleValueWithFallback {
  return {
    fallback,
    toString: () => value,
    value,
  };
}

function isFallbackStyleValue(value: EmailStyleValue): value is EmailStyleValueWithFallback {
  return typeof value === 'object' && value !== null && 'fallback' in value && 'value' in value;
}

/** Combine tokenized values while retaining both browser and email declarations. */
export function combineStyleValues(values: readonly EmailStyleValue[], separator = ' '): EmailStyleValue {
  const fallback = values
    .map((value) => (isFallbackStyleValue(value) ? value.fallback : String(value)))
    .join(separator);
  const modern = values.map(String).join(separator);
  return fallback === modern ? modern : tokenWithFallback(modern, fallback);
}

/** Resolve a shared typography token to literal, inline email declarations. */
export function typographyStyle(variant: EmailTypographyVariant): EmailStyle {
  const token = typography[variant];
  return {
    fontFamily: token.fontFamily,
    fontSize: 'fontSize' in token ? token.fontSize : undefined,
    fontWeight: 'fontWeight' in token ? token.fontWeight : undefined,
    letterSpacing: 'letterSpacing' in token ? token.letterSpacing : undefined,
    lineHeight: token.lineHeight,
  };
}

/** Resolve a semantic light-theme color with a conservative email fallback. */
export function colorValue(color: EmailColor): EmailStyleValueWithFallback {
  return tokenWithFallback(colorTokens[color], colorFallbacks[color]);
}

/** Resolve a shared spacing token and retain a pixel fallback for clients with weak rem support. */
export function spacingValue(scale: EmailSpacingScale): EmailStyleValue {
  const value = spacing[scale];
  if (value === '0') {
    return value;
  }
  const rem = Number.parseFloat(value);
  return tokenWithFallback(value, `${Math.round(rem * 14)}px`);
}

export function radiusValue(scale: EmailRadiusScale): EmailStyleValue {
  const value = radius[scale];
  if (value === '0') {
    return value;
  }
  const rem = Number.parseFloat(value);
  return tokenWithFallback(value, `${Math.round(rem * 14)}px`);
}

export function borderWidthValue(scale: keyof typeof borderWidth): EmailStyleValue {
  const value = borderWidth[scale];
  const rem = Number.parseFloat(value);
  return tokenWithFallback(value, `${Math.round(rem * 14)}px`);
}

/** Resolve a control size token to a literal value with a pixel fallback. */
export function sizeValue(scale: EmailSizeScale, property: 'font' | 'pad-block' | 'pad-inline'): EmailStyleValue {
  const value = size[property][scale];
  return tokenWithFallback(value, `${Math.round(Number.parseFloat(value) * 14)}px`);
}

/** Resolve the line-height token used by a control size. */
export function sizeLeadingValue(scale: EmailSizeScale): number {
  return size.leading[scale];
}

export interface EmailControlColors {
  readonly background: EmailColor | 'transparent';
  readonly text: EmailColor;
  readonly border: EmailColor | undefined;
}

const controlColorMap: Record<EmailControlVariant, EmailControlColors> = {
  critical: { background: 'critical.default', border: undefined, text: 'critical.text' },
  error: { background: 'error.default', border: undefined, text: 'error.text' },
  ghost: { background: 'transparent', border: undefined, text: 'text.primary' },
  info: { background: 'info.default', border: undefined, text: 'info.text' },
  neutral: { background: 'default.default', border: undefined, text: 'text.on-primary' },
  primary: { background: 'primary.default', border: undefined, text: 'text.on-primary' },
  secondary: { background: 'bg.surface', border: 'border.default', text: 'text.primary' },
  success: { background: 'success.default', border: undefined, text: 'success.text' },
  tertiary: { background: 'transparent', border: undefined, text: 'text.primary' },
  warning: { background: 'warning.default', border: undefined, text: 'warning.text' },
};

/** Map the email-safe Forge control variants to semantic token roles. */
export function controlColors(variant: EmailControlVariant): EmailControlColors {
  return controlColorMap[variant];
}

export function containerWidthValue(scale: keyof typeof size.width): string {
  const value = size.width[scale];
  return value === '100vw' ? '100%' : value;
}

export function spacingStyle(scale: EmailSpacingScale, property: 'padding' | 'margin'): EmailStyle {
  return { [property]: spacingValue(scale) };
}
