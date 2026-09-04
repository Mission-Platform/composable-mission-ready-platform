import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCalloutBlock } from './forge-callout-block';

const ReactCallout = toReactComponent(ForgeCalloutBlock, 'CalloutBlock');
const VueCallout = toVueComponent(ForgeCalloutBlock, 'CalloutBlock');
describe('ForgeCalloutBlock', () => {
  it('keeps the title and description across adapters', async () => {
    const properties = { title: 'Title', description: 'Description', type: 'warning' as const };
    const react = renderToStaticMarkup(createElement(ReactCallout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCallout, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Title');
      expect(html).toContain('Description');
      expect(html).toContain('forge-callout-block--warning');
    }
  });
  it('does not require optional content', () => {
    expect(renderToStaticMarkup(createElement(ReactCallout, { title: 'Only a title' }))).toContain('Only a title');
  });
});
