import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'article',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'main',
  'mark',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  's',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];
const ALLOWED_ATTRIBUTES = [
  'align',
  'alt',
  'class',
  'data-mp-code',
  'data-mp-language',
  'href',
  'src',
  'start',
  'style',
  'title',
];
const URL_ATTRIBUTES = ['href', 'src'] as const;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[/#?]|[^:]*$)/i;
const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);
const ALLOWED_ATTRIBUTE_SET = new Set(ALLOWED_ATTRIBUTES);

function decodeUrlForInspection(value: string): string {
  let decoded = value;
  for (let index = 0; index < 8; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded
    .replaceAll(/&#x([a-f\d]+);|&#(\d+);/gi, (match, hexadecimal: string, decimal: string) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 1_114_111 ? String.fromCodePoint(codePoint) : match;
    })
    .replaceAll(/[\u0000-\u0020\u007F-\u009F]/g, '')
    .toLowerCase();
}

/** Return a URL only when it uses a non-executable, supported scheme. */
export function sanitizeUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const inspected = decodeUrlForInspection(trimmed);
  if (/^(?:javascript|vbscript|data):/.test(inspected)) return undefined;
  const explicitScheme = /^[a-z][a-z\d+.-]*:/.exec(inspected)?.[0];
  if (!explicitScheme) return trimmed;

  try {
    return ALLOWED_PROTOCOLS.has(new URL(trimmed).protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeStyle(value: string): string | undefined {
  const alignment = /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i.exec(value)?.[1];
  return alignment ? `text-align:${alignment.toLowerCase()}` : undefined;
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function fallbackSanitizeHtml(value: string): string {
  return value.replaceAll(
    /<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)([^>]*)>/gi,
    (raw, rawName: string, rawAttributes: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAG_SET.has(name)) return '';
      if (raw.startsWith('</')) return `</${name}>`;

      const attributes: string[] = [];
      // HTML attributes support quoted and unquoted forms; all values are filtered below.
      // eslint-disable-next-line sonarjs/regex-complexity
      const attributePattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      for (
        let match = attributePattern.exec(rawAttributes);
        match !== null;
        match = attributePattern.exec(rawAttributes)
      ) {
        const attribute = match[1].toLowerCase();
        if (!ALLOWED_ATTRIBUTE_SET.has(attribute)) continue;
        const attributeValue = match[2] ?? match[3] ?? match[4] ?? '';
        const safeValue = URL_ATTRIBUTES.includes(attribute as (typeof URL_ATTRIBUTES)[number])
          ? sanitizeUrl(attributeValue)
          : attribute === 'style'
            ? sanitizeStyle(attributeValue)
            : attributeValue;
        if (safeValue !== undefined) attributes.push(`${attribute}="${escapeAttribute(safeValue)}"`);
      }
      return `<${name}${attributes.length > 0 ? ` ${attributes.join(' ')}` : ''}>`;
    },
  );
}

/** Sanitize persisted/editor HTML while retaining the editor's formatting markup. */
export function sanitizeHtml(value: string): string {
  if (typeof DOMPurify.sanitize !== 'function' || DOMPurify.isSupported === false) return fallbackSanitizeHtml(value);

  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_TAGS,
    ALLOWED_URI_REGEXP,
    KEEP_CONTENT: true,
  });
  if (typeof document === 'undefined') return sanitized;

  const template = document.createElement('template');
  template.innerHTML = sanitized;
  for (const element of template.content.querySelectorAll<HTMLElement>('[href], [src], [style]')) {
    for (const attribute of URL_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current !== null) {
        const safe = sanitizeUrl(current);
        if (safe === undefined) element.removeAttribute(attribute);
        else element.setAttribute(attribute, safe);
      }
    }
    const style = element.getAttribute('style');
    if (style !== null) {
      const safeStyle = sanitizeStyle(style);
      if (safeStyle === undefined) element.removeAttribute('style');
      else element.setAttribute('style', safeStyle);
    }
  }
  return template.innerHTML;
}
