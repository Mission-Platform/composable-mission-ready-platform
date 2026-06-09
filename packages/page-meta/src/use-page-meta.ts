import { useHead } from '@unhead/vue';
import { computed, toValue } from 'vue';

import { buildPageMeta, type BuiltPageMeta } from './build-page-meta';

import type { PageMetadata } from './types';
import type { MaybeRefOrGetter } from 'vue';

/** Options accepted by {@link usePageMeta}. */
export interface UsePageMetaOptions {
  /**
   * Reserved for future use. Kept for API compatibility with earlier versions
   * that performed manual DOM cleanup; `@unhead/vue` handles scope-based
   * cleanup automatically.
   */
  cleanupOnDispose?: boolean;
}

/** Convert a {@link BuiltPageMeta} into `@unhead/vue`'s `Head` shape. */
function toUnheadHead(built: BuiltPageMeta): {
  title?: string;
  htmlAttrs?: { lang?: string };
  meta: Array<Record<string, string>>;
  link: Array<Record<string, string>>;
} {
  const meta = built.metaTags.map((tag) => ({ [tag.key]: tag.attr, content: tag.content }));
  const link = built.linkTags.map((tag) => {
    const entry: Record<string, string> = { rel: tag.rel, href: tag.href };
    if (tag.hreflang) entry.hreflang = tag.hreflang;
    return entry;
  });
  const head: ReturnType<typeof toUnheadHead> = { meta, link };
  if (built.title !== undefined) head.title = built.title;
  if (built.language !== undefined) head.htmlAttrs = { lang: built.language };
  return head;
}

/**
 * Reactively synchronise standard page metadata (title, `<html lang>`,
 * description, canonical, robots, theme-color, hreflang alternates, etc.)
 * with the document head.
 *
 * Internally delegates to `@unhead/vue`'s `useHead`, which handles both
 * client-side DOM mutation **and** server-side head serialisation (used by
 * frameworks like `vite-ssg` to bake the tags into prerendered HTML).
 *
 * Accepts a ref, a getter, or a plain {@link PageMetadata} object so it can
 * be used both with reactive state and with static page metadata.
 *
 * @example
 * // Static metadata in a route component
 * usePageMeta({
 *   title: 'About us',
 *   description: 'Who we are',
 *   canonical: 'https://example.com/about',
 *   language: 'en-AU',
 * })
 *
 * @example
 * // Reactive ref driven by app state
 * const meta = ref<PageMetadata>({ title: 'Home' })
 * usePageMeta(meta)
 */
export function usePageMeta(metadata: MaybeRefOrGetter<PageMetadata>, _options: UsePageMetaOptions = {}): void {
  const head = computed(() => toUnheadHead(buildPageMeta(toValue(metadata))));
  useHead(head);
}
