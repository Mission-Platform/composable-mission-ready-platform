import { marked, type Tokens } from 'marked';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

/** A single entry in a document's table of contents. */
export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** Convert heading text into a stable, URL-safe anchor id. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

/** Strip the common inline Markdown markers so heading labels read cleanly. */
function plainText(text: string): string {
  return text.replaceAll(/[*_`~]/g, '').trim();
}

/**
 * Resolve a relative Markdown link (e.g. `./testing.md`, `../overview.md`)
 * into an in-app route path, resolved relative to the current document's
 * directory. Returns `undefined` for links that are not Markdown documents.
 */
function resolveInternalHref(href: string, currentSlug: string): string | undefined {
  const [pathPart, hash] = href.split('#');
  if (!/\.md$/i.test(pathPart)) return undefined;

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
  return `/${slug}${hash ? `#${hash}` : ''}`;
}

/**
 * Build the `h2`/`h3` table of contents for a Markdown document. Anchor ids are
 * assigned with the same slug + de-duplication scheme as `ForgeMarkdown` (which
 * counts every heading level), so the links stay in sync with the ids the
 * renderer places on each heading.
 */
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

/**
 * Reactive Markdown helpers for the document identified by `slug`. Rendering is
 * delegated to the shared `ForgeMarkdown` component (code → `ForgeCodeBlock`,
 * tables → `ForgeTable`, text → `ForgeTypography`); this composable only derives
 * the table of contents and a `resolveHref` that rewrites relative `.md` links
 * to in-app routes for `ForgeMarkdown`.
 */
export function useMarkdown(
  source: MaybeRefOrGetter<string>,
  slug: MaybeRefOrGetter<string>,
): { toc: ComputedRef<TocItem[]>; resolveHref: ComputedRef<(href: string) => string | undefined> } {
  const toc = computed(() => buildToc(toValue(source)));
  const resolveHref = computed(() => {
    const currentSlug = toValue(slug);
    return (href: string): string | undefined => resolveInternalHref(href, currentSlug);
  });
  return { toc, resolveHref };
}
