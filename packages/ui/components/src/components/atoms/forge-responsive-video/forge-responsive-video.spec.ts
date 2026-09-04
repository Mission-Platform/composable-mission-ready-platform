import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeResponsiveVideo } from './forge-responsive-video';

/**
 * Exercises the **neutral** `ForgeResponsiveVideo` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the rounded affordance, the accessible label, and the
 * format-specific `<source>` entries.
 */
const ReactResponsiveVideo = toReactComponent(ForgeResponsiveVideo, 'ResponsiveVideo');
const VueResponsiveVideo = toVueComponent(ForgeResponsiveVideo, 'ResponsiveVideo');

describe('ForgeResponsiveVideo authors the same component for React and Vue', () => {
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
      expect(html).toContain('forge-responsive-video');
      expect(html).toContain('forge-responsive-video--rounded');
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
