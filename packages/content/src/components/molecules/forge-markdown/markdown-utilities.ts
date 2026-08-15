import { marked, type Token, type Tokens } from 'marked';

import { sanitizeUrl } from '../../../utils/sanitize';

import type { CodeBlockLanguage } from '../../atoms/forge-code-block';
import type { TypographyVariant } from '@mission-platform/components';

/** Size token — canonical 2xs → 2xl scale. */
export type MarkdownSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Languages registered with the bundled `highlight.js` in `ForgeCodeBlock`. */
const CODE_BLOCK_LANGUAGES = new Set<CodeBlockLanguage>([
  'bash',
  'css',
  'dockerfile',
  'go',
  'ini',
  'javascript',
  'json',
  'markdown',
  'plaintext',
  'python',
  'rust',
  'scss',
  'shell',
  'sql',
  'typescript',
  'xml',
  'yaml',
]);

/** Common fenced-code language aliases mapped onto a registered language. */
const LANGUAGE_ALIASES: Record<string, CodeBlockLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  sh: 'bash',
  zsh: 'bash',
  html: 'xml',
  vue: 'xml',
  svelte: 'xml',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
};

/** Maps a heading depth (`1`–`6`) onto the matching `ForgeTypography` variant. */
export const HEADING_VARIANT: Record<number, TypographyVariant> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
};

/** Parse Markdown `source` into the top-level `marked` block token stream. */
export function lexMarkdown(source: string): Token[] {
  return source ? [...marked.lexer(source)] : [];
}

/** Resolve a fenced-code `lang` string to a registered `CodeBlockLanguage`. */
export function normalizeLanguage(lang: string | undefined): CodeBlockLanguage {
  if (!lang) return 'plaintext';
  const base = lang.trim().split(/\s+/)[0].toLowerCase();
  const mapped = LANGUAGE_ALIASES[base] ?? (base as CodeBlockLanguage);
  return CODE_BLOCK_LANGUAGES.has(mapped) ? mapped : 'plaintext';
}

/** Whether a fenced-code language requests a Mermaid diagram instead of code highlighting. */
export function isMermaidLanguage(lang: string | undefined): boolean {
  return lang?.trim().split(/\s+/)[0].toLowerCase() === 'mermaid';
}

/** Reverse the five HTML entities `marked` escapes so text renders literally. */
export function decodeEntities(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/** Convert heading text into a stable, URL-safe anchor id. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{N}_]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Whether an `href` points off-site (and should open in a new tab). */
export function isAbsoluteHref(href: string): boolean {
  const safeHref = sanitizeUrl(href);
  return safeHref !== undefined && (/^(https?:)?\/\//i.test(safeHref) || /^(mailto:|tel:)/i.test(safeHref));
}

/** Flatten a list of inline tokens down to their plain-text content. */
export function inlineToPlainText(tokens: Token[] | undefined, fallback = ''): string {
  if (!tokens) return decodeEntities(fallback);
  let out = '';
  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const nested = (token as Tokens.Text).tokens;
        out += nested ? inlineToPlainText(nested) : decodeEntities((token as Tokens.Text).text);
        break;
      }
      case 'escape':
      case 'codespan': {
        out += decodeEntities((token as Tokens.Codespan).text);
        break;
      }
      case 'strong':
      case 'em':
      case 'del':
      case 'link': {
        out += inlineToPlainText((token as Tokens.Link).tokens);
        break;
      }
      case 'br': {
        out += ' ';
        break;
      }
      default: {
        out += decodeEntities((token as { raw?: string }).raw ?? '');
      }
    }
  }
  return out;
}

/**
 * Walk the whole token tree and assign every heading a stable, de-duplicated
 * anchor id, keyed by the heading token's identity. Precomputed once in the root
 * so ids stay deterministic and unique across the recursive render.
 */
export function collectHeadingIds(tokens: Token[]): Map<Token, string> {
  const ids = new Map<Token, string>();
  const counts = new Map<string, number>();
  const visit = (list: Token[] | undefined): void => {
    if (!list) return;
    for (const token of list) {
      if (token.type === 'heading') {
        const heading = token as Tokens.Heading;
        const base = slugify(inlineToPlainText(heading.tokens, heading.text).trim());
        const count = counts.get(base) ?? 0;
        counts.set(base, count + 1);
        ids.set(token, count > 0 ? `${base}-${count}` : base);
      }
      const children = (token as { tokens?: Token[] }).tokens;
      if (Array.isArray(children)) visit(children);
      const items = (token as Tokens.List).items;
      if (Array.isArray(items)) for (const item of items) visit(item.tokens);
    }
  };
  visit(tokens);
  return ids;
}

/** Build the `ForgeTable` column set from a GFM table token. */
export function tableColumns(
  token: Tokens.Table,
): Array<{ key: string; label: string; align: 'left' | 'center' | 'right' }> {
  return token.header.map((cell, index) => ({
    key: `col-${index}`,
    label: inlineToPlainText(cell.tokens, cell.text),
    align: token.align[index] ?? 'left',
  }));
}

/** Build the `ForgeTable` row records from a GFM table token. */
export function tableRows(token: Tokens.Table): Array<Record<string, unknown>> {
  return token.rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (const [index, cell] of row.entries()) {
      record[`col-${index}`] = inlineToPlainText(cell.tokens, cell.text);
    }
    return record;
  });
}
