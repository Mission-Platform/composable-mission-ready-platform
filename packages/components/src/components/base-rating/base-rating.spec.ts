import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseRating } from './base-rating';

/**
 * Exercises the **neutral** `BaseRating` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the interactive slider role, the read-only image role, and the star
 * count.
 */
const ReactRating = toReactComponent(BaseRating, 'Rating');
const VueRating = toVueComponent(BaseRating, 'Rating');

describe('BaseRating authors the same component for React and Vue', () => {
  it('renders an interactive slider with the value on both frameworks', async () => {
    const properties = { modelValue: 3, max: 5, ariaLabel: 'Product rating' };
    const react = renderToStaticMarkup(createElement(ReactRating, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRating, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-label="Product rating"');
      expect(html).toContain('aria-valuenow="3"');
      expect(html).toContain('aria-valuemax="5"');
      // Five star glyphs are rendered (each as an empty + filled layer).
      expect(html.split('★').length - 1).toBe(10);
    }
  });

  it('renders a read-only rating as an image on both frameworks', async () => {
    const properties = { modelValue: 4, readonly: true, max: 5 };
    const react = renderToStaticMarkup(createElement(ReactRating, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRating, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="img"');
      expect(html).toContain('4 out of 5');
      expect(html).not.toContain('role="slider"');
    }
  });
});
