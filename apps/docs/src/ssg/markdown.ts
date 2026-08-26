/**
 * Shared Markdown → HTML pipeline used by the docs prerenderer and available to
 * the browser runtime. Mirrors the heading-id / internal-link rules from
 * `use-markdown` + ForgeMarkdown so static HTML matches client content closely.
 */
import hljs from 'highlight.js';
import { marked, type Tokens } from 'marked';

import { docsDirectoryForRoot, qualifiedSlug, type DocumentationSourceRoot } from '../documentation-sources.ts';

import { DEFAULT_LOCALE, documentPath, type DocumentationLocale } from './site-constants.ts';

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocItem[];
  title: string;
  description: string;
}

export interface MarkdownLinkContext {
  readonly currentRoot?: DocumentationSourceRoot;
  readonly roots?: readonly DocumentationSourceRoot[];
  readonly hasDocument?: (slug: string, locale: DocumentationLocale) => boolean;
}

const DEFAULT_DESCRIPTION = 'Documentation for the Mission Platform — a composable, mission-ready monorepo.';
const DESCRIPTION_MAX_LENGTH = 160;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{N}_]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function plainText(text: string): string {
  return text.replaceAll(/[*_`~]/g, '').trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallback;
}

export function extractDescription(markdown: string, fallback = DEFAULT_DESCRIPTION): string {
  const withoutCode = markdown.replaceAll(/```[\s\S]*?```/g, '').replaceAll(/<!--[\s\S]*?-->/g, '');
  const provenancePattern =
    /^(machine-assisted|machine-supported|machine-generated|machine translation|assisted translation|maschinenunterstützte|traducción|traduction|traduzione|תרגום|machineondersteunde|由规范|정식|正規の|ترجمة)/i;

  for (const rawBlock of withoutCode.split(/\n{2,}/)) {
    const block = rawBlock.trim();
    if (block.length === 0) continue;
    if (/^(#{1,6}\s|>|\||[-*+]\s|\d+\.\s)/.test(block)) continue;
    if (provenancePattern.test(block)) continue;

    const text = block
      .replaceAll(/\r?\n/g, ' ')
      .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replaceAll(/[*_`]+/g, '')
      .replaceAll(/\s+/g, ' ')
      .trim();

    if (text.length === 0) continue;
    if (text.length <= DESCRIPTION_MAX_LENGTH) return text;
    return `${text.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
  }

  return fallback;
}

/** Resolve a relative Markdown link into an in-app route path. */
export function resolveInternalHref(
  href: string,
  currentSlug: string,
  locale: DocumentationLocale = DEFAULT_LOCALE,
  context: MarkdownLinkContext = {},
): string | undefined {
  const [pathPart, hash] = href.split('#');
  if (!/\.md$/i.test(pathPart)) return undefined;

  if (context.currentRoot !== undefined && context.roots !== undefined) {
    const root = context.currentRoot;
    const localSlug = root.routePrefix === '' ? currentSlug : currentSlug.slice(`${root.routePrefix}/`.length);
    const currentFile = [...docsDirectoryForRoot(root).split('/'), ...localSlug.split('/')];
    currentFile[currentFile.length - 1] = `${currentFile.at(-1)}.md`;
    const target = [...currentFile.slice(0, -1), ...pathSegments(pathPart.replace(/\.md$/i, '').split('/'))];
    const targetPath = normalizeSegments(target);
    const owner = context.roots.find((candidate) => {
      const prefix = `${docsDirectoryForRoot(candidate)}/`;
      return targetPath.startsWith(prefix);
    });
    if (owner === undefined) return undefined;
    const targetDocument = targetPath.slice(`${docsDirectoryForRoot(owner)}/`.length);
    const slug = qualifiedSlug(owner, targetDocument);
    if (context.hasDocument !== undefined && !context.hasDocument(slug, locale)) return undefined;
    return `${documentPath(slug, locale)}${hash ? `#${hash}` : ''}`;
  }

  const baseSegments = currentSlug.includes('/') ? currentSlug.split('/').slice(0, -1) : [];
  const segments = [...baseSegments];

  for (const segment of pathPart.replace(/\.md$/i, '').split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }

  const slug = segments.join('/');
  return `${documentPath(slug, locale)}${hash ? `#${hash}` : ''}`;
}

function pathSegments(segments: readonly string[]): string[] {
  return segments.filter((segment) => segment !== '' && segment !== '.');
}

function normalizeSegments(segments: readonly string[]): string {
  const normalized: string[] = [];
  for (const segment of segments) {
    if (segment === '..') normalized.pop();
    else if (segment !== '.') normalized.push(segment);
  }
  return normalized.join('/');
}

function buildToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  const toc: TocItem[] = [];
  const counts = new Map<string, number>();
  for (const token of marked.lexer(markdown)) {
    if (token.type !== 'heading') continue;
    const heading = token as Tokens.Heading;
    const base = slugify(heading.text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    const id = count > 0 ? `${base}-${count}` : base;
    if (heading.depth === 2 || heading.depth === 3) {
      toc.push({ id, text: plainText(heading.text), depth: heading.depth });
    }
  }
  return toc;
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
    const resolved = internal ?? href ?? '';
    const titleAttribute = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : '';
    const internalAttribute = internal ? ' data-internal="true"' : '';
    const externalAttributes =
      !internal && /^(https?:)?\/\//i.test(resolved) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(resolved)}"${titleAttribute}${internalAttribute}${externalAttributes}>${escapeHtml(plainText(label))}</a>`;
  };

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
