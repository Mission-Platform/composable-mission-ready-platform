import { useHead } from '@unhead/vue';
import { computed, toValue } from 'vue';

import { buildOpenGraph } from './build-open-graph';
import { buildPageMeta, type BuiltPageMeta } from './build-page-meta';

import type { JsonLd, OpenGraphMetadata, SeoMetadata, SeoMetaTag } from './types';
import type { MaybeRefOrGetter } from 'vue';

/**
 * Strip any JSON-LD `<script type="application/ld+json">` tags that were
 * baked into the HTML by the static-site generator (or any other SSR step)
 * before `@unhead/vue` mounts on the client.
 *
 * These prerendered tags are plain DOM nodes — `@unhead/vue` does not own
 * them, so when `useHead` re-emits the same JSON-LD blocks on hydration it
 * appends a fresh set of `<script>` tags rather than replacing the SSR ones.
 * The result is duplicated `Organization` / `WebSite` / `WebPage` entries
 * on every page load.
 *
 * Removing the SSR-rendered scripts once, before the first `useHead` call,
 * leaves a single authoritative copy that unhead manages and updates
 * reactively on subsequent route changes.
 */
let ssrJsonLdStripped = false;
function stripSsrJsonLdOnce(): void {
  if (ssrJsonLdStripped) return;
  ssrJsonLdStripped = true;
  const document = (
    globalThis as { document?: { head: { querySelectorAll: (s: string) => Iterable<{ remove: () => void }> } } }
  ).document;
  if (!document) return;
  const nodes = document.head.querySelectorAll('script[type="application/ld+json"]');
  for (const node of nodes) node.remove();
}

interface UnheadShape {
  title?: string;
  htmlAttrs?: { lang?: string };
  meta: Array<Record<string, string>>;
  link: Array<Record<string, string>>;
  script: Array<Record<string, string>>;
}

function metaTagToUnhead(tag: SeoMetaTag): Record<string, string> {
  return { [tag.key]: tag.attr, content: tag.content };
}

function pageMetaToUnhead(built: BuiltPageMeta): Partial<UnheadShape> {
  const meta = built.metaTags.map((tag) => metaTagToUnhead(tag));
  const link = built.linkTags.map((tag) => {
    const entry: Record<string, string> = { rel: tag.rel, href: tag.href };
    if (tag.hreflang) entry.hreflang = tag.hreflang;
    return entry;
  });
  const out: Partial<UnheadShape> = { meta, link };
  if (built.title !== undefined) out.title = built.title;
  if (built.language !== undefined) out.htmlAttrs = { lang: built.language };
  return out;
}

function openGraphToUnhead(metadata: OpenGraphMetadata): Array<Record<string, string>> {
  return buildOpenGraph(metadata).map((tag) => metaTagToUnhead(tag));
}

function jsonLdToUnhead(blocks: JsonLd | JsonLd[]): Array<Record<string, string>> {
  const list = Array.isArray(blocks) ? blocks : [blocks];
  return list.map((block) => ({
    type: 'application/ld+json',
    // `innerHTML` is the `@unhead/vue` convention for raw script body content;
    // it is written into the script element's text without HTML escaping.
    innerHTML: JSON.stringify(block),
  }));
}

/**
 * Build the combined `@unhead/vue` head payload from the unified SEO bundle:
 * standard page meta, Open Graph + Twitter Card meta, and one or more JSON-LD
 * structured-data scripts.
 */
function toUnheadHead(metadata: SeoMetadata): UnheadShape {
  const meta: Array<Record<string, string>> = [];
  const link: Array<Record<string, string>> = [];
  const script: Array<Record<string, string>> = [];
  const head: UnheadShape = { meta, link, script };

  if (metadata.page) {
    const pageHead = pageMetaToUnhead(buildPageMeta(metadata.page));
    if (pageHead.title !== undefined) head.title = pageHead.title;
    if (pageHead.htmlAttrs) head.htmlAttrs = pageHead.htmlAttrs;
    if (pageHead.meta) meta.push(...pageHead.meta);
    if (pageHead.link) link.push(...pageHead.link);
  }

  if (metadata.openGraph) {
    meta.push(...openGraphToUnhead(metadata.openGraph));
  }

  if (metadata.jsonLd) {
    script.push(...jsonLdToUnhead(metadata.jsonLd));
  }

  return head;
}

/**
 * Reactively synchronise the full Mission Platform SEO surface — standard
 * page metadata, Open Graph / Twitter Card meta tags, and JSON-LD
 * structured-data scripts — with the document head.
 *
 * Internally delegates to `@unhead/vue`'s `useHead`, which handles both
 * client-side DOM mutation **and** server-side head serialisation (used by
 * frameworks like `vite-ssg` to bake the tags into prerendered HTML).
 *
 * Accepts a ref, a getter, or a plain {@link SeoMetadata} object so it can
 * be used both with reactive state and with static metadata.
 */
export function useSeo(metadata: MaybeRefOrGetter<SeoMetadata>): void {
  stripSsrJsonLdOnce();
  const head = computed(() => toUnheadHead(toValue(metadata)));
  useHead(head);
}
