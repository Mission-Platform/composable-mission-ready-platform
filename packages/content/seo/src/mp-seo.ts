import { computed, defineComponent, type PropType } from 'vue';

import { useSeo } from './composables/use-seo/use-seo';

import type { JsonLd, OpenGraphMetadata, PageMetadata, SeoMetadata } from './types';

/** Stable, hoisted render function for the renderless `<Seo>` component. */
const renderNothing = (): undefined => undefined;

/**
 * Renderless `<Seo>` component — a declarative wrapper around {@link useSeo}.
 *
 * Mount once near the root of the app (or per-route) and pass the page,
 * Open Graph, and JSON-LD blocks as props; the component will reactively
 * synchronise them into the document head. Renders no DOM of its own.
 *
 * @example
 * <Seo
 *   :page="{ title: 'About', description: '…', canonical: 'https://x.test/about' }"
 *   :open-graph="{ title: 'About', url: 'https://x.test/about', images: ['…'] }"
 *   :json-ld="[webSite({ name: 'X', url: 'https://x.test' })]"
 * />
 */
export const MpSeo = defineComponent({
  name: 'MpSeo',
  props: {
    /** Standard page metadata block. */
    page: { type: Object as PropType<PageMetadata>, default: undefined },
    /** Open Graph + Twitter Card block. */
    openGraph: { type: Object as PropType<OpenGraphMetadata>, default: undefined },
    /** One or more JSON-LD structured-data scripts. */
    jsonLd: { type: [Object, Array] as PropType<JsonLd | JsonLd[]>, default: undefined },
  },
  setup(properties) {
    const seo = computed<SeoMetadata>(() => ({
      page: properties.page,
      openGraph: properties.openGraph,
      jsonLd: properties.jsonLd,
    }));
    useSeo(seo);
    return renderNothing;
  },
});
