import { useHead } from '@unhead/vue';
import { computed, toValue } from 'vue';

import { buildMetaTags } from './build-meta-tags';

import type { MetaTag, OpenGraphMetadata } from './types';
import type { MaybeRefOrGetter } from 'vue';

/** Options accepted by {@link useOpenGraph}. */
export interface UseOpenGraphOptions {
  /** When `true`, also mirror `metadata.title` onto `<title>` / `document.title`. */
  updateDocumentTitle?: boolean;
}

/** Convert a flat `MetaTag[]` into the shape expected by `@unhead/vue`. */
function toUnheadMeta(tags: MetaTag[]): Array<Record<string, string>> {
  return tags.map((tag) => ({ [tag.key]: tag.attr, content: tag.content }));
}

/**
 * Reactively synchronise Open Graph (and optional Twitter) `<meta>` tags with
 * the document head.
 *
 * Internally delegates to `@unhead/vue`'s `useHead`, which handles both
 * client-side DOM mutation **and** server-side head serialisation (used by
 * frameworks like `vite-ssg` to bake the tags into prerendered HTML).
 *
 * Accepts a ref, a getter, or a plain `OpenGraphMetadata` object so it can be
 * used both with reactive state and with static page metadata:
 *
 * @example
 * // Component using a reactive ref
 * const meta = ref<OpenGraphMetadata>({ title: 'Home', description: '...' })
 * useOpenGraph(meta)
 *
 * @example
 * // Static metadata in a route component
 * useOpenGraph({
 *   title: 'About us',
 *   description: 'Who we are',
 *   url: 'https://example.com/about',
 *   images: ['https://example.com/og.png'],
 * })
 */
export function useOpenGraph(metadata: MaybeRefOrGetter<OpenGraphMetadata>, options: UseOpenGraphOptions = {}): void {
  const { updateDocumentTitle = false } = options;

  const head = computed(() => {
    const value = toValue(metadata);
    const tags = buildMetaTags(value);
    const result: { meta: Array<Record<string, string>>; title?: string } = {
      meta: toUnheadMeta(tags),
    };
    if (updateDocumentTitle && value.title) {
      result.title = value.title;
    }
    return result;
  });

  useHead(head);
}
