import { DEFAULT_LOCALE, type DocumentationLocale } from '../i18n';
import { buildToc, resolveInternalHref, type MarkdownLinkContext, type TocItem } from '../shared/markdown-utils';

export { resolveInternalHref };
export type { MarkdownLinkContext, TocItem };

export interface MarkdownValue<T> {
  readonly value: T;
}

type MarkdownSource = string | (() => string);

function readValue<T>(value: T | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value;
}

/**
 * Reactive Markdown helpers for the document identified by `slug`. Rendering is
 * delegated to the shared `ForgeMarkdown` component (code → `ForgeCodeBlock`,
 * tables → `ForgeTable`, text → `ForgeTypography`); this composable only derives
 * the table of contents and a `resolveHref` that rewrites relative `.md` links
 * to in-app routes for `ForgeMarkdown`.
 */
export function useMarkdown(
  source: MarkdownSource,
  slug: MarkdownSource,
  locale: DocumentationLocale | (() => DocumentationLocale) = DEFAULT_LOCALE,
  context: MarkdownLinkContext = {},
): { toc: MarkdownValue<TocItem[]>; resolveHref: MarkdownValue<(href: string) => string | undefined> } {
  const markdown = readValue(source);
  const currentSlug = readValue(slug);
  const currentLocale = readValue(locale);
  const toc = { value: buildToc(markdown) };
  const resolveHref = {
    value: (href: string): string | undefined => resolveInternalHref(href, currentSlug, currentLocale, context),
  };
  return { toc, resolveHref };
}
