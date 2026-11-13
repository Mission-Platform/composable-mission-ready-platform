/**
 * Shared Markdown → HTML pipeline used by the docs prerenderer and available to
 * the browser runtime. Mirrors the heading-id / internal-link rules from
 * `use-markdown` + ForgeMarkdown so static HTML matches client content closely.
 */
import hljs from 'highlight.js';
import { marked, type Tokens } from 'marked';

import {
  buildToc,
  extractDescription,
  extractTitle,
  plainText,
  resolveInternalHref,
  slugify,
  type MarkdownLinkContext,
  type TocItem,
} from '../shared/markdown-utils.ts';

import { DEFAULT_LOCALE, type DocumentationLocale } from './site-constants.ts';

export type { MarkdownLinkContext, TocItem };
export { buildToc, extractDescription, extractTitle, resolveInternalHref };

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
  title: string;
  description: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

/** Match Forge Markdown's rejection of executable URL schemes. */
function sanitizeUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const inspected = decodeUrlForInspection(trimmed);
  if (/^(?:javascript|vbscript|data):/.test(inspected)) return undefined;
  const explicitScheme = /^[a-z][a-z\d+.-]*:/.exec(inspected)?.[0];
  if (!explicitScheme) return trimmed;

  try {
    return new Set(['http:', 'https:', 'mailto:', 'tel:']).has(new URL(trimmed).protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function highlightCode(code: string, language: string | undefined): string {
  const lang = language?.trim().split(/\s+/)[0]?.toLowerCase();
  if (lang === 'mermaid') {
    return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
  }
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre><code class="hljs language-${escapeHtml(lang)}">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
    } catch {
      // Fall through to escaped plaintext.
    }
  }
  return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
}

/**
 * Render Markdown source to HTML using the same heading-id and internal-link
 * conventions as the browser docs app.
 */
export function renderDocumentationMarkdown(
  source: string,
  slug: string,
  locale: DocumentationLocale = DEFAULT_LOCALE,
  context: MarkdownLinkContext = {},
): RenderedMarkdown {
  const toc = buildToc(source);
  const title = extractTitle(source, slug.split('/').pop() ?? slug);
  const description = extractDescription(source);

  const headingCounts = new Map<string, number>();
  const renderer = new marked.Renderer();

  renderer.heading = ({ tokens, depth, text }: Tokens.Heading): string => {
    const label = plainText(
      tokens ? tokens.map((token) => ('text' in token ? String(token.text ?? '') : '')).join('') || text : text,
    );
    const base = slugify(label || text);
    const count = headingCounts.get(base) ?? 0;
    headingCounts.set(base, count + 1);
    const id = count > 0 ? `${base}-${count}` : base;
    return `<h${depth} id="${escapeHtml(id)}">${label ? escapeHtml(label) : escapeHtml(text)}</h${depth}>\n`;
  };

  renderer.link = ({ href, title: linkTitle, tokens }: Tokens.Link): string => {
    const label =
      tokens?.map((token) => ('text' in token ? String(token.text ?? '') : (token.raw ?? ''))).join('') ?? '';
    const internal = href ? resolveInternalHref(href, slug, locale, context) : undefined;
    const resolved = sanitizeUrl(internal ?? href);
    const hrefAttribute = resolved ? ` href="${escapeHtml(resolved)}"` : '';
    const titleAttribute = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : '';
    const internalAttribute = internal && resolved ? ' data-internal="true"' : '';
    const externalAttributes =
      !internal && resolved && /^(https?:)?\/\//i.test(resolved) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a${hrefAttribute}${titleAttribute}${internalAttribute}${externalAttributes}>${escapeHtml(plainText(label))}</a>`;
  };

  renderer.image = ({ href, title, text }: Tokens.Image): string => {
    const source = sanitizeUrl(href);
    const sourceAttribute = source ? ` src="${escapeHtml(source)}"` : '';
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img${sourceAttribute} alt="${escapeHtml(text)}"${titleAttribute}>`;
  };

  // Forge Markdown renders raw HTML as text. Keep the native fallback equally safe.
  renderer.html = ({ text }: Tokens.HTML): string => escapeHtml(text);

  renderer.code = ({ text, lang }: Tokens.Code): string => `${highlightCode(text, lang)}\n`;

  const html = marked.parse(source, {
    async: false,
    gfm: true,
    breaks: false,
    renderer,
  }) as string;

  return { html, toc, title, description };
}

/** Render a compact “On this page” TOC list for static HTML. */
export function renderTocHtml(toc: readonly TocItem[], title = 'On this page'): string {
  if (toc.length === 0) return '';
  const items = toc
    .map(
      (item) =>
        `<li class="docs-document__toc-item--depth-${item.depth}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`,
    )
    .join('');
  return `<aside class="docs-document__toc" aria-label="${escapeHtml(title)}"><p>${escapeHtml(title)}</p><ul>${items}</ul></aside>`;
}
