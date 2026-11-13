import { marked, type Tokens } from 'marked';

import { docsDirectoryForRoot, qualifiedSlug, type DocumentationSourceRoot } from '../documentation-sources.ts';
import { DEFAULT_LOCALE, type DocumentationLocale } from '../i18n.ts';
import { documentPath } from '../ssg/site-constants.ts';

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface MarkdownLinkContext {
  readonly currentRoot?: DocumentationSourceRoot;
  readonly roots?: readonly DocumentationSourceRoot[];
  readonly hasDocument?: (slug: string, locale: DocumentationLocale) => boolean;
}

export const DEFAULT_DESCRIPTION = 'Documentation for the Mission Platform — a composable, mission-ready monorepo.';
export const DESCRIPTION_MAX_LENGTH = 160;

/** Convert heading text into a stable, URL-safe anchor id. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{N}_]+/gu, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Strip the common inline Markdown markers so heading labels read cleanly. */
export function plainText(text: string): string {
  return text.replaceAll(/[*_`~]/g, '').trim();
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

export function pathSegments(segments: readonly string[]): string[] {
  return segments.filter((segment) => segment !== '' && segment !== '.');
}

export function normalizeSegments(segments: readonly string[]): string {
  const normalized: string[] = [];
  for (const segment of segments) {
    if (segment === '..') normalized.pop();
    else if (segment !== '.') normalized.push(segment);
  }
  return normalized.join('/');
}

/**
 * Resolve a relative Markdown link (e.g. `./testing.md`, `../overview.md`)
 * into an in-app route path, resolved relative to the current document's
 * directory. Returns `undefined` for links that are not Markdown documents.
 */
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
    const currentFileName = currentFile.pop();
    if (currentFileName !== undefined) currentFile.push(`${currentFileName}.md`);
    const targetPath = normalizeSegments([
      ...currentFile.slice(0, -1),
      ...pathSegments(pathPart.replace(/\.md$/i, '').split('/')),
    ]);
    const owner = context.roots.find((candidate) => targetPath.startsWith(`${docsDirectoryForRoot(candidate)}/`));
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

/**
 * Build the `h2`/`h3` table of contents for a Markdown document. Anchor ids are
 * assigned with the same slug + de-duplication scheme as `ForgeMarkdown` (which
 * counts every heading level), so the links stay in sync with the ids the
 * renderer places on each heading.
 */
export function buildToc(markdown: string): TocItem[] {
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
