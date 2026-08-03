import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseCard } from './base-card';

/**
 * Exercises the **neutral** `BaseCard` authored in this package, rendering it on
 * both frameworks through the `@mission-platform/forge` runtime adapters. Covers
 * the conditional header/footer regions and the default-slot body.
 */
const ReactCard = toReactComponent(BaseCard, 'Card');
const VueCard = toVueComponent(BaseCard, 'Card');

describe('BaseCard authors the same component for React and Vue', () => {
  it('renders header, body, and footer regions on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactCard, { padding: 'lg', shadow: true, header: 'Title', footer: 'Actions' }, 'Body text'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueCard, { padding: 'lg', shadow: true, header: 'Title', footer: 'Actions' }, () => 'Body text'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<article');
      expect(html).toContain('base-card--padding-lg');
      expect(html).toContain('base-card--shadow');
      expect(html).toContain('base-card__header');
      expect(html).toContain('Title');
      expect(html).toContain('base-card__body');
      expect(html).toContain('Body text');
      expect(html).toContain('base-card__footer');
      expect(html).toContain('Actions');
    }
  });

  it('omits the header and footer regions when not supplied on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactCard, { bordered: false }, 'Just a body'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueCard, { bordered: false }, () => 'Just a body') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Just a body');
      expect(html).not.toContain('base-card__header');
      expect(html).not.toContain('base-card__footer');
    }
  });
});
