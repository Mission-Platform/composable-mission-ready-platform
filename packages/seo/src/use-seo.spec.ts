import { createHead, renderDOMHead } from '@unhead/vue/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { organization, webSite } from './build-json-ld';
import { useSeo } from './use-seo';

import type { SeoMetadata } from './types';

const renderEmpty = (): unknown => h('div');

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
  document.documentElement.removeAttribute('lang');
});

function mountWithSeo(setup: () => void) {
  const head = createHead();
  const App = defineComponent({
    setup() {
      setup();
      return renderEmpty;
    },
  });
  const app = createApp(App);
  app.use(head);
  const root = document.createElement('div');
  app.mount(root);
  return { app, head };
}

describe('useSeo', () => {
  it('applies standard page meta, Open Graph and JSON-LD in a single pass', async () => {
    const { app, head } = mountWithSeo(() => {
      useSeo({
        page: { title: 'Home', description: 'desc', language: 'en-AU', canonical: 'https://x.test/' },
        openGraph: { title: 'Home', url: 'https://x.test/', siteName: 'X' },
        jsonLd: [webSite({ name: 'X', url: 'https://x.test/' }), organization({ name: 'X', url: 'https://x.test/' })],
      });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('Home');
    expect(document.documentElement.getAttribute('lang')).toBe('en-AU');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('desc');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://x.test/');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Home');

    const ldScripts = [...document.head.querySelectorAll('script[type="application/ld+json"]')];
    // All JSON-LD nodes are combined into a single `@graph` document.
    expect(ldScripts).toHaveLength(1);
    const graphDocument = JSON.parse(ldScripts[0].textContent ?? '{}');
    expect(graphDocument['@context']).toBe('https://schema.org');
    expect(Array.isArray(graphDocument['@graph'])).toBe(true);
    expect(graphDocument['@graph'].map((entry: { '@type': string }) => entry['@type'])).toEqual([
      'WebSite',
      'Organization',
    ]);
    // The shared `@context` is hoisted to the graph root, not repeated per node.
    for (const node of graphDocument['@graph']) {
      expect(node['@context']).toBeUndefined();
    }

    app.unmount();
  });

  it('reactively updates the head when the input ref changes', async () => {
    const seo = ref<SeoMetadata>({
      page: { title: 'A', description: 'one' },
      openGraph: { title: 'A' },
    });
    const { app, head } = mountWithSeo(() => {
      useSeo(seo);
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('A');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('A');

    seo.value = {
      page: { title: 'B', description: 'two' },
      openGraph: { title: 'B' },
    };
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('B');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('two');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('B');

    app.unmount();
  });

  it('removes owned tags when the app is unmounted', async () => {
    const { app, head } = mountWithSeo(() => {
      useSeo({
        page: { description: 'temp' },
        jsonLd: webSite({ name: 'X', url: 'https://x.test/' }),
      });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[name="description"]')).not.toBeNull();
    expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();

    app.unmount();
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
