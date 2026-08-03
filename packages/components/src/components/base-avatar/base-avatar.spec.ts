import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseAvatar } from './base-avatar';

/**
 * Exercises the **neutral** `BaseAvatar` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the image, initials, and presence-status branches.
 */
const ReactAvatar = toReactComponent(BaseAvatar, 'Avatar');
const VueAvatar = toVueComponent(BaseAvatar, 'Avatar');

describe('BaseAvatar authors the same component for React and Vue', () => {
  it('renders an image avatar with a presence dot on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactAvatar, { src: 'https://example.com/a.png', alt: 'Ada', size: 'lg', status: 'online' }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueAvatar, { src: 'https://example.com/a.png', alt: 'Ada', size: 'lg', status: 'online' }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('avatar');
      expect(html).toContain('avatar--lg');
      expect(html).toContain('https://example.com/a.png');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="online"');
    }
  });

  it('renders the initials fallback when there is no image on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactAvatar, { initials: 'AB', shape: 'square' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueAvatar, { initials: 'AB', shape: 'square' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('avatar__initials');
      expect(html).toContain('avatar--square');
      expect(html).toContain('AB');
    }
  });
});
