import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSeparator } from './base-separator';

/**
 * Exercises the **neutral** `BaseSeparator` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers both the plain rule (`<hr>`) and the labelled variant.
 */
const ReactSeparator = toReactComponent(BaseSeparator, 'Separator');
const VueSeparator = toVueComponent(BaseSeparator, 'Separator');

describe('BaseSeparator authors the same component for React and Vue', () => {
  it('renders a plain rule with the separator role on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSeparator, { variant: 'dashed' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSeparator, { variant: 'dashed' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-separator');
      expect(html).toContain('base-separator--horizontal');
      expect(html).toContain('base-separator--dashed');
      expect(html).toContain('role="separator"');
    }
  });

  it('renders a centred label between two lines on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSeparator, {}, 'OR'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSeparator, {}, () => 'OR') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-separator--labelled');
      expect(html).toContain('base-separator__label');
      expect(html).toContain('OR');
    }
  });
});
