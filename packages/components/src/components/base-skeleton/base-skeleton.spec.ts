import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSkeleton } from './base-skeleton';

/**
 * Exercises the **neutral** `BaseSkeleton` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the shape modifier, the animated affordance, and the explicit
 * width/height overrides.
 */
const ReactSkeleton = toReactComponent(BaseSkeleton, 'Skeleton');
const VueSkeleton = toVueComponent(BaseSkeleton, 'Skeleton');

describe('BaseSkeleton authors the same component for React and Vue', () => {
  it('renders an animated circle with explicit dimensions on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSkeleton, { shape: 'circle', width: '60%', height: '2rem' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueSkeleton, { shape: 'circle', width: '60%', height: '2rem' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-skeleton');
      expect(html).toContain('base-skeleton--circle');
      expect(html).toContain('base-skeleton--animated');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('60%');
      expect(html).toContain('2rem');
    }
  });

  it('omits the animated modifier when disabled on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSkeleton, { animated: false }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSkeleton, { animated: false }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-skeleton--line');
      expect(html).not.toContain('base-skeleton--animated');
    }
  });
});
