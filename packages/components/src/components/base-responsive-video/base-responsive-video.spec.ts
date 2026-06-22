import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseResponsiveVideo } from './base-responsive-video';

/**
 * Exercises the **neutral** `BaseResponsiveVideo` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the rounded affordance, the accessible label, and the
 * format-specific `<source>` entries.
 */
const ReactResponsiveVideo = toReactComponent(BaseResponsiveVideo, 'ResponsiveVideo');
const VueResponsiveVideo = toVueComponent(BaseResponsiveVideo, 'ResponsiveVideo');

describe('BaseResponsiveVideo authors the same component for React and Vue', () => {
  it('renders a labelled, rounded video with a single source on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactResponsiveVideo, { src: 'https://example.test/a.mp4', label: 'A clip', rounded: true }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueResponsiveVideo, { src: 'https://example.test/a.mp4', label: 'A clip', rounded: true }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<video');
      expect(html).toContain('base-responsive-video');
      expect(html).toContain('base-responsive-video--rounded');
      expect(html).toContain('aria-label="A clip"');
      expect(html).toContain('https://example.test/a.mp4');
    }
  });

  it('renders one source per format entry on both frameworks', async () => {
    const sources = [
      { src: 'https://example.test/a.webm', type: 'video/webm' },
      { src: 'https://example.test/a.mp4', type: 'video/mp4' },
    ];
    const react = renderToStaticMarkup(createElement(ReactResponsiveVideo, { sources }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueResponsiveVideo, { sources }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('https://example.test/a.webm');
      expect(html).toContain('video/webm');
      expect(html).toContain('https://example.test/a.mp4');
    }
  });
});
