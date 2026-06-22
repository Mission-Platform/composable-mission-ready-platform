import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseQuote } from './base-quote';

/**
 * Exercises the **neutral** `BaseQuote` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the quotation content, attribution, and the omitted-attribution path.
 */
const ReactQuote = toReactComponent(BaseQuote, 'Quote');
const VueQuote = toVueComponent(BaseQuote, 'Quote');

describe('BaseQuote authors the same component for React and Vue', () => {
  it('renders the quotation with attribution on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactQuote, { variant: 'bordered', author: 'Ada Lovelace', source: 'Notes' }, 'To be or not'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueQuote, { variant: 'bordered', author: 'Ada Lovelace', source: 'Notes' }, () => 'To be or not'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<figure');
      expect(html).toContain('<blockquote');
      expect(html).toContain('base-quote--bordered');
      expect(html).toContain('To be or not');
      expect(html).toContain('<figcaption');
      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('<cite');
      expect(html).toContain('Notes');
    }
  });

  it('omits the attribution footer when there is no author/source on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactQuote, { variant: 'plain' }, 'Anonymous wisdom'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueQuote, { variant: 'plain' }, () => 'Anonymous wisdom') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Anonymous wisdom');
      expect(html).not.toContain('<figcaption');
    }
  });
});
