import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCollapse } from './forge-collapse';

/**
 * Exercises the **neutral** `ForgeCollapse` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the `<details>` shell, the fallback summary, the disabled modifier, and
 * the default-slot body.
 */
const ReactCollapse = toReactComponent(ForgeCollapse, 'Collapse');
const VueCollapse = toVueComponent(ForgeCollapse, 'Collapse');

describe('ForgeCollapse authors the same component for React and Vue', () => {
  it('renders a details disclosure with summary and body on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactCollapse, { summary: 'More info', open: true }, 'Hidden body'),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueCollapse, { summary: 'More info', open: true }, () => 'Hidden body') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<details');
      expect(html).toContain('forge-collapse');
      expect(html).toContain('<summary');
      expect(html).toContain('More info');
      expect(html).toContain('forge-collapse__chevron');
      expect(html).toContain('forge-collapse__content');
      expect(html).toContain('Hidden body');
    }
  });

  it('applies the disabled modifier on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactCollapse, { disabled: true }, 'Body'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueCollapse, { disabled: true }, () => 'Body') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-collapse--disabled');
      // Falls back to the default summary text when none is provided.
      expect(html).toContain('Details');
    }
  });
});
