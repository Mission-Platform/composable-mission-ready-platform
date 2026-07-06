import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseBackgroundVideo } from './base-background-video';

/**
 * Exercises the **neutral** `BaseBackgroundVideo` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the decorative (`aria-hidden`) video, the scrim overlay, the
 * format-specific sources, and the foreground default slot.
 */
const ReactBackgroundVideo = toReactComponent(BaseBackgroundVideo, 'BackgroundVideo');
const VueBackgroundVideo = toVueComponent(BaseBackgroundVideo, 'BackgroundVideo');

describe('BaseBackgroundVideo authors the same component for React and Vue', () => {
  it('renders a decorative covered video with an overlay on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactBackgroundVideo, { src: 'https://example.test/bg.mp4', overlay: true }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueBackgroundVideo, { src: 'https://example.test/bg.mp4', overlay: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-background-video');
      expect(html).toContain('base-background-video--overlay');
      expect(html).toContain('base-background-video__video');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('https://example.test/bg.mp4');
    }
  });

  it('layers foreground default-slot content above the video on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactBackgroundVideo, { src: 'https://example.test/bg.mp4' }, 'Hello mission'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueBackgroundVideo, { src: 'https://example.test/bg.mp4' }, () => 'Hello mission'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-background-video__content');
      expect(html).toContain('Hello mission');
    }
  });
});
