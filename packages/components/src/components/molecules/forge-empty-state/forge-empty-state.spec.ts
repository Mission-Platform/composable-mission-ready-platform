import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeEmptyState } from './forge-empty-state';

const ReactEmptyState = toReactComponent(ForgeEmptyState, 'EmptyState');
const VueEmptyState = toVueComponent(ForgeEmptyState, 'EmptyState');
describe('ForgeEmptyState', () => {
  it('renders the empty message on both frameworks', async () => {
    const properties = { title: 'No items', description: 'Add your first item.' };
    const react = renderToStaticMarkup(createElement(ReactEmptyState, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueEmptyState, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('No items');
      expect(html).toContain('Add your first item.');
    }
  });
  it('uses the title as the section label by default', () => {
    expect(renderToStaticMarkup(createElement(ReactEmptyState, { title: 'Empty' }))).toContain('aria-label="Empty"');
  });

  it('renders the default icon when no icon property is supplied', () => {
    expect(renderToStaticMarkup(createElement(ReactEmptyState, { title: 'Empty' }))).toContain(
      'forge-empty-state__icon',
    );
  });
});
