import type { PageLinkTag, PageMetaTag, PageMetadata } from './types';

/** Marker used to tag elements that we own and may safely update or remove. */
export const PAGE_META_OWNER_ATTR = 'data-mp-page-meta';

/** Result of {@link buildPageMeta} — everything the applier needs to sync. */
export interface BuiltPageMeta {
  /** Resolved page title (with `titleTemplate` applied), if any. */
  title?: string;
  /** Resolved `<html lang>` value, if any. */
  language?: string;
  /** Flat list of `<meta>` tag descriptors. */
  metaTags: PageMetaTag[];
  /** Flat list of `<link>` tag descriptors. */
  linkTags: PageLinkTag[];
}

function pushMeta(tags: PageMetaTag[], attribute: string, content: string | number | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key: 'name', attr: attribute, content: String(content) });
}

function normalizeKeywords(keywords: PageMetadata['keywords']): string | undefined {
  if (keywords === undefined) return undefined;
  if (Array.isArray(keywords)) {
    const joined = keywords
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0)
      .join(', ');
    return joined.length > 0 ? joined : undefined;
  }
  return keywords.trim().length > 0 ? keywords : undefined;
}

function resolveTitle(metadata: PageMetadata): string | undefined {
  if (!metadata.title) return undefined;
  if (metadata.titleTemplate && metadata.titleTemplate.includes('%s')) {
    return metadata.titleTemplate.replaceAll('%s', metadata.title);
  }
  return metadata.title;
}

/**
 * Convert {@link PageMetadata} into the resolved title, language, and flat
 * lists of `<meta>` / `<link>` tag descriptors.
 *
 * The output order is stable and mirrors the rough order developers would
 * write tags by hand: charset → viewport → description-style meta →
 * canonical/alternate links.
 */
export function buildPageMeta(metadata: PageMetadata): BuiltPageMeta {
  const metaTags: PageMetaTag[] = [];
  const linkTags: PageLinkTag[] = [];

  if (metadata.charset) {
    // `<meta charset>` is matched by attribute presence, not by name; we
    // expose it as an http-equiv-keyed entry so the applier can dedupe it
    // alongside the other meta tags.
    metaTags.push({ key: 'http-equiv', attr: 'content-type', content: `text/html; charset=${metadata.charset}` });
  }

  pushMeta(metaTags, 'viewport', metadata.viewport);
  pushMeta(metaTags, 'description', metadata.description);
  pushMeta(metaTags, 'keywords', normalizeKeywords(metadata.keywords));
  pushMeta(metaTags, 'author', metadata.author);
  pushMeta(metaTags, 'robots', metadata.robots);
  pushMeta(metaTags, 'theme-color', metadata.themeColor);
  pushMeta(metaTags, 'generator', metadata.generator);
  pushMeta(metaTags, 'application-name', metadata.applicationName);

  for (const [attribute, value] of Object.entries(metadata.extra ?? {})) {
    pushMeta(metaTags, attribute, value);
  }

  if (metadata.canonical) {
    linkTags.push({ rel: 'canonical', href: metadata.canonical });
  }
  for (const alternate of metadata.alternates ?? []) {
    if (!alternate.href || !alternate.hreflang) continue;
    linkTags.push({ rel: 'alternate', href: alternate.href, hreflang: alternate.hreflang });
  }

  return {
    title: resolveTitle(metadata),
    language: metadata.language,
    metaTags,
    linkTags,
  };
}
