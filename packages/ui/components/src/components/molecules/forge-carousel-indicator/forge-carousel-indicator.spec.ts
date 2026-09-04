import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCarouselIndicator } from './forge-carousel-indicator';

const ReactIndicator = toReactComponent(ForgeCarouselIndicator, 'CarouselIndicator');
const VueIndicator = toVueComponent(ForgeCarouselIndicator, 'CarouselIndicator');
describe('ForgeCarouselIndicator', () => {
  it('renders one labelled button per slide and marks the active one', async () => {
    const properties = { total: 3, current: 1 };
    const react = renderToStaticMarkup(createElement(ReactIndicator, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueIndicator, properties) }));
    for (const html of [react, vue]) {
      expect(html.match(/<button/g)).toHaveLength(3);
      expect(html).toContain('aria-label="Go to slide 2"');
      expect(html).toContain('aria-selected="true"');
    }
  });
  it('handles an empty count without rendering controls', () => {
    expect(renderToStaticMarkup(createElement(ReactIndicator, { total: 0, current: 0 }))).not.toContain('<button');
  });
});
