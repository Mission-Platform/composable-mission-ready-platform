import type { EmailStyle, EmailStyleValue, EmailStyleValueWithFallback } from './types';

const FORBIDDEN_STYLE_PATTERN = /^(?:(?:--|-(?:webkit|moz|ms|o)-)|(?:flex|grid|var\(|!important\b))/i;
const FORBIDDEN_PROPERTY_PATTERN =
  /^(?:--|(?:block-size|inline-size|margin-block|margin-inline|padding-block|padding-inline|inset(?:-.*)?))$/i;

/** Convert a JavaScript style key to the CSS spelling used in email markup. */
function toCssProperty(property: string): string {
  return property.replaceAll(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function isFallbackStyleValue(value: EmailStyleValue): value is EmailStyleValueWithFallback {
  return typeof value === 'object' && value !== null && 'fallback' in value && 'value' in value;
}

function validateStylePrimitive(property: string, value: string | number): string {
  const serialized = String(value).trim();
  if (serialized.length === 0 || FORBIDDEN_STYLE_PATTERN.test(serialized)) {
    throw new Error(`Email style "${property}" contains a forbidden value.`);
  }

  return serialized;
}

function validateStyleValue(property: string, value: EmailStyleValue): readonly string[] | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (isFallbackStyleValue(value)) {
    return [validateStylePrimitive(property, value.fallback), validateStylePrimitive(property, value.value)];
  }

  return [validateStylePrimitive(property, value)];
}

/** Serialize inline styles in deterministic property order without CSS variables. */
export function serializeStyle(style: EmailStyle | string): string {
  if (typeof style === 'string') {
    if (FORBIDDEN_STYLE_PATTERN.test(style)) {
      throw new Error('Email style contains a forbidden value.');
    }
    return style
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .toSorted((left, right) => left.localeCompare(right))
      .join('; ');
  }

  return Object.entries(style)
    .flatMap(([property, value]) => {
      const cssProperty = toCssProperty(property);
      if (FORBIDDEN_PROPERTY_PATTERN.test(cssProperty)) {
        throw new Error(`Email style property "${cssProperty}" is not supported.`);
      }

      return (
        validateStyleValue(property, value)?.map((validatedValue, declarationIndex) => ({
          declarationIndex,
          property: cssProperty,
          value: validatedValue,
        })) ?? []
      );
    })
    .toSorted(
      (left, right) => left.property.localeCompare(right.property) || left.declarationIndex - right.declarationIndex,
    )
    .map(({ property, value }) => `${property}: ${value}`)
    .join('; ');
}
