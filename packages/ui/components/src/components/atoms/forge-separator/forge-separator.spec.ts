import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSeparator } from './forge-separator';

/**
 * Exercises the **neutral** `ForgeSeparator` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers both the plain rule (`<hr>`) and the labelled variant.
 */
const ReactSeparator = toReactComponent(ForgeSeparator, 'Separator');
const VueSeparator = toVueComponent(ForgeSeparator, 'Separator');

describe('ForgeSeparator authors the same component for React and Vue', () => {
  it('renders a plain rule with the separator role on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSeparator, { variant: 'dashed' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSeparator, { variant: 'dashed' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-separator');
      expect(html).toContain('forge-separator--horizontal');
      expect(html).toContain('forge-separator--dashed');
      expect(html).toContain('role="separator"');
    }
  });

  it('renders a centred label between two lines on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSeparator, {}, 'OR'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSeparator, {}, () => 'OR') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-separator--labelled');
      expect(html).toContain('forge-separator__label');
      expect(html).toContain('OR');
    }
  });
});
