import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeZPatternLayout } from './forge-z-pattern-layout';

const ReactZPatternLayout = toReactComponent(ForgeZPatternLayout, 'ZPatternLayout');
const VueZPatternLayout = toVueComponent(ForgeZPatternLayout, 'ZPatternLayout');

describe('ForgeZPatternLayout authors the same component for React and Vue', () => {
  it('renders alternating regions in semantic source order on both frameworks', async () => {
    const properties = {
      topStart: 'Top start',
      topEnd: 'Top end',
      middle: 'Middle',
      bottomStart: 'Bottom start',
      bottomEnd: 'Bottom end',
    };
    const react = renderToStaticMarkup(createElement(ReactZPatternLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueZPatternLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('z-pattern-layout');
      expect(html).toContain('z-pattern-layout__top-start');
      expect(html).toContain('z-pattern-layout__top-end');
      expect(html).toContain('z-pattern-layout__middle');
      expect(html).toContain('z-pattern-layout__bottom-start');
      expect(html).toContain('z-pattern-layout__bottom-end');
      expect(html.indexOf('Top start')).toBeLessThan(html.indexOf('Top end'));
      expect(html.indexOf('Top end')).toBeLessThan(html.indexOf('Middle'));
      expect(html.indexOf('Middle')).toBeLessThan(html.indexOf('Bottom start'));
      expect(html.indexOf('Bottom start')).toBeLessThan(html.indexOf('Bottom end'));
    }
  });

  it('omits empty alternating regions without changing the remaining source order', async () => {
    const properties = { topStart: 'Top start', bottomEnd: 'Bottom end' };
    const react = renderToStaticMarkup(createElement(ReactZPatternLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueZPatternLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('z-pattern-layout__top-start');
      expect(html).toContain('z-pattern-layout__bottom-end');
      expect(html).not.toContain('z-pattern-layout__middle');
      expect(html.indexOf('Top start')).toBeLessThan(html.indexOf('Bottom end'));
    }
  });
});
