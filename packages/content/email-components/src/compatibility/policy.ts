export const CAN_I_EMAIL_FEATURES_URL = 'https://www.caniemail.com/features';
export const CAN_I_EMAIL_TABLES_URL = 'https://www.caniemail.com/features/html-tables';
export const CAN_I_EMAIL_INLINE_STYLES_URL = 'https://www.caniemail.com/features/css-inline-styles';
export const CAN_I_EMAIL_MEDIA_QUERIES_URL = 'https://www.caniemail.com/features/css-at-media';
export const CAN_I_EMAIL_MAX_WIDTH_URL = 'https://www.caniemail.com/features/css-max-width';
export const COMPATIBILITY_REVIEWED = '2026-08-08';

export const EMAIL_ALLOWED_TAGS = [
  'a',
  'body',
  'br',
  'code',
  'del',
  'div',
  'em',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'html',
  'img',
  'li',
  'meta',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'style',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'title',
  'tr',
  'ul',
] as const;

const FORBIDDEN_OUTPUT_PATTERNS = [
  /<script\b/i,
  /\bon[a-z]+\s*=/i,
  /javascript\s*:/i,
  /var\(--/i,
  /display\s*:\s*(?:flex|grid)/i,
  /(?:inline-size|block-size|margin-inline|margin-block|padding-inline|padding-block)\s*:/i,
  /data-v-[a-z\d]+/i,
  /ng-reflect-/i,
] as const;

/** Assert the conservative output subset documented for email components. */
export function assertCompatibleEmailHtml(html: string): void {
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(html)) {
      throw new Error(`Email output contains a forbidden pattern: ${pattern}`);
    }
  }
}
