import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeResponsiveImage } from './forge-responsive-image';

/**
 * Exercises the **neutral** `ForgeResponsiveImage` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the `<picture>`/fallback-`<img>` structure, the art-directed
 * `<source>` entries, and the rounded affordance.
 */
const ReactResponsiveImage = toReactComponent(ForgeResponsiveImage, 'ResponsiveImage');
const VueResponsiveImage = toVueComponent(ForgeResponsiveImage, 'ResponsiveImage');

describe('ForgeResponsiveImage authors the same component for React and Vue', () => {
  it('renders a rounded picture with a fallback image on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactResponsiveImage, { src: 'https://example.test/a.jpg', alt: 'A photo', rounded: true }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueResponsiveImage, { src: 'https://example.test/a.jpg', alt: 'A photo', rounded: true }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<picture');
      expect(html).toContain('forge-responsive-image');
      expect(html).toContain('forge-responsive-image--rounded');
      expect(html).toContain('forge-responsive-image__img');
      expect(html).toContain('https://example.test/a.jpg');
      expect(html).toContain('A photo');
    }
  });

  it('renders one source per art-directed entry on both frameworks', async () => {
    const sources = [
      { srcset: 'https://example.test/wide.jpg', media: '(min-width: 768px)' },
      { srcset: 'https://example.test/narrow.jpg', media: '(max-width: 767px)' },
    ];
    const react = renderToStaticMarkup(
      createElement(ReactResponsiveImage, { src: 'https://example.test/a.jpg', alt: '', sources }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueResponsiveImage, { src: 'https://example.test/a.jpg', alt: '', sources }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('https://example.test/wide.jpg');
      expect(html).toContain('https://example.test/narrow.jpg');
      expect(html).toContain('(min-width: 768px)');
    }
  });
});
