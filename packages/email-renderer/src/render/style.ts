import type { EmailStyle, EmailStyleValue } from './types';

const FORBIDDEN_STYLE_PATTERN = /^(?:(?:--|-(?:webkit|moz|ms|o)-)|(?:flex|grid|var\(|!important\b))/i;
const FORBIDDEN_PROPERTY_PATTERN =
  /^(?:--|(?:block-size|inline-size|margin-block|margin-inline|padding-block|padding-inline|inset(?:-.*)?))$/i;

/** Convert a JavaScript style key to the CSS spelling used in email markup. */
function toCssProperty(property: string): string {
  return property.replaceAll(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function validateStyleValue(property: string, value: EmailStyleValue): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const serialized = String(value).trim();
  if (serialized.length === 0 || FORBIDDEN_STYLE_PATTERN.test(serialized)) {
    throw new Error(`Email style "${property}" contains a forbidden value.`);
  }

  return serialized;
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
    .map(([property, value]) => [toCssProperty(property), validateStyleValue(property, value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined)
    .map(([property, value]) => {
      if (FORBIDDEN_PROPERTY_PATTERN.test(property)) {
        throw new Error(`Email style property "${property}" is not supported.`);
      }
      return [property, value] as const;
    })
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}
