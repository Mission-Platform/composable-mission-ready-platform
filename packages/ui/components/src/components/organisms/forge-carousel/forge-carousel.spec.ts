import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCarousel } from './forge-carousel';

/**
 * Exercises the **neutral** `ForgeCarousel` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the slide track, the controls/indicators, and the initial index.
 */
const ReactCarousel = toReactComponent(ForgeCarousel, 'Carousel');
const VueCarousel = toVueComponent(ForgeCarousel, 'Carousel');

const SLIDES = [
  { id: 's1', content: 'Slide one' },
  { id: 's2', content: 'Slide two' },
  { id: 's3', content: 'Slide three' },
];

describe('ForgeCarousel authors the same component for React and Vue', () => {
  it('renders one slide per item inside the track on both frameworks', async () => {
    const properties = { slides: SLIDES, ariaLabel: 'Promotions' };
    const react = renderToStaticMarkup(createElement(ReactCarousel, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCarousel, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-roledescription="carousel"');
      expect(html).toContain('aria-label="Promotions"');
      expect(html.match(/aria-roledescription="slide"/g)).toHaveLength(3);
      expect(html).toContain('Slide one');
    }
  });

  it('renders controls and indicators when there is more than one slide on both frameworks', async () => {
    const properties = { slides: SLIDES };
    const react = renderToStaticMarkup(createElement(ReactCarousel, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCarousel, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Previous slide"');
      expect(html).toContain('aria-label="Next slide"');
      expect(html).toContain('role="tablist"');
      expect(html.match(/role="tab"/g)).toHaveLength(3);
    }
  });

  it('offsets the track to the controlled initial index on both frameworks', async () => {
    const properties = { slides: SLIDES, modelValue: 2 };
    const react = renderToStaticMarkup(createElement(ReactCarousel, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCarousel, properties) }));

    for (const html of [react, vue]) {
      // The third slide is shown: -200%.
      expect(html).toContain('translateX(-200%)');
    }
  });

  it('hides controls and indicators for a single slide on both frameworks', async () => {
    const properties = { slides: [{ id: 'only', content: 'Lonely slide' }] };
    const react = renderToStaticMarkup(createElement(ReactCarousel, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCarousel, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('aria-label="Next slide"');
      expect(html).not.toContain('role="tablist"');
      expect(html).toContain('Lonely slide');
    }
  });
});
