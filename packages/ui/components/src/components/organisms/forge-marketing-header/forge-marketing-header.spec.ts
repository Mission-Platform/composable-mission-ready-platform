import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMarketingHeader } from './forge-marketing-header';

const ReactHeader = toReactComponent(ForgeMarketingHeader, 'MarketingHeader');
const VueHeader = toVueComponent(ForgeMarketingHeader, 'MarketingHeader');

describe('ForgeMarketingHeader', () => {
  it('renders brand navigation and a mobile menu control on both frameworks', async () => {
    const properties = {
      title: 'Mission platform',
      subtitle: 'Build better products.',
      actions: [{ id: 'start', label: 'Get started', href: '/start' }],
      backgroundImage: '/hero.jpg',
      overlay: true,
      align: 'center' as const,
      minHeight: '20rem',
    };
    const react = renderToStaticMarkup(createElement(ReactHeader, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueHeader, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('<header');
      expect(html).toContain('Mission platform');
      expect(html).toContain('Build better products.');
      expect(html).toContain('Get started');
      expect(html).toContain('forge-marketing-header--overlay');
      expect(html).toContain('background-image');
    }
  });
});
