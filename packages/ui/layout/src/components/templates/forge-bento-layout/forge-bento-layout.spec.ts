import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeBentoLayout } from './forge-bento-layout';

const ReactBentoLayout = toReactComponent(ForgeBentoLayout, 'BentoLayout');
const VueBentoLayout = toVueComponent(ForgeBentoLayout, 'BentoLayout');

describe('ForgeBentoLayout authors the same component for React and Vue', () => {
  it('renders supplied regions in semantic source order on both frameworks', async () => {
    const properties = { hero: 'Hero', feature: 'Feature', supporting: 'Supporting' };
    const react = renderToStaticMarkup(createElement(ReactBentoLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBentoLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('bento-layout');
      expect(html).toContain('bento-layout__hero');
      expect(html).toContain('bento-layout__feature');
      expect(html).toContain('bento-layout__supporting');
      expect(html.indexOf('Hero')).toBeLessThan(html.indexOf('Feature'));
      expect(html.indexOf('Feature')).toBeLessThan(html.indexOf('Supporting'));
    }
  });

  it('omits empty optional region wrappers on both frameworks', async () => {
    const properties = { hero: 'Hero' };
    const react = renderToStaticMarkup(createElement(ReactBentoLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueBentoLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('bento-layout__hero');
      expect(html).not.toContain('bento-layout__feature');
      expect(html).not.toContain('bento-layout__supporting');
    }
  });
});
