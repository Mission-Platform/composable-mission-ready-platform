import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeAssetBrowser } from './forge-asset-browser';

const ReactAssetBrowser = toReactComponent(ForgeAssetBrowser, 'AssetBrowser');
const VueAssetBrowser = toVueComponent(ForgeAssetBrowser, 'AssetBrowser');
const items = [
  { id: 'logo', name: 'Logo', src: '/logo.svg' },
  { id: 'banner', name: 'Banner', src: '/banner.jpg' },
];

describe('ForgeAssetBrowser', () => {
  it('renders searchable, selectable assets on both frameworks', async () => {
    const properties = { items, view: 'grid' as const, selectable: true, uploadable: true };
    const react = renderToStaticMarkup(createElement(ReactAssetBrowser, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueAssetBrowser, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('role="listbox"');
      expect(html).toContain('aria-multiselectable="true"');
      expect(html).toContain('Logo');
      expect(html).toContain('type="search"');
      expect(html).toContain('type="file"');
    }
  });

  it('renders the empty state when there are no assets', () => {
    expect(renderToStaticMarkup(createElement(ReactAssetBrowser, { items: [] }))).toContain('No assets found');
  });

  it('renders a breadcrumb trail and list view', () => {
    const html = renderToStaticMarkup(
      createElement(ReactAssetBrowser, {
        items,
        view: 'list',
        breadcrumb: [{ label: 'Library' }, { label: 'Brand' }],
      }),
    );
    expect(html).toContain('Library');
    expect(html).toContain('Brand');
    expect(html).toContain('forge-asset-browser--list');
  });
});
