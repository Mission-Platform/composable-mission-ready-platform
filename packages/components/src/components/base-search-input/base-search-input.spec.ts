import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSearchInput } from './base-search-input';

/**
 * Exercises the **neutral** `BaseSearchInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Covers the search field, the clear button, and the loading state.
 */
const ReactSearchInput = toReactComponent(BaseSearchInput, 'SearchInput');
const VueSearchInput = toVueComponent(BaseSearchInput, 'SearchInput');

describe('BaseSearchInput authors the same component for React and Vue', () => {
  it('renders the search field and a clear button when there is a value on both frameworks', async () => {
    const properties = { modelValue: 'hello', placeholder: 'Find…' };
    const react = renderToStaticMarkup(createElement(ReactSearchInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSearchInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="search"');
      expect(html).toContain('placeholder="Find…"');
      expect(html).toContain('value="hello"');
      expect(html).toContain('aria-label="Clear search"');
    }
  });

  it('hides the clear button and shows the loading spinner on both frameworks', async () => {
    const properties = { modelValue: '', loading: true };
    const react = renderToStaticMarkup(createElement(ReactSearchInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSearchInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('aria-label="Clear search"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('role="status"');
    }
  });
});
