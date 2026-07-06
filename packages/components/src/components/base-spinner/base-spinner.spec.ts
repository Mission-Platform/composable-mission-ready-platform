import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSpinner } from './base-spinner';

/**
 * Exercises the **neutral** `BaseSpinner` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the tone/size modifiers and the accessible label.
 */
const ReactSpinner = toReactComponent(BaseSpinner, 'Spinner');
const VueSpinner = toVueComponent(BaseSpinner, 'Spinner');

describe('BaseSpinner authors the same component for React and Vue', () => {
  it('renders a toned, sized status spinner on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSpinner, { variant: 'success', size: 'lg' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueSpinner, { variant: 'success', size: 'lg' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-spinner');
      expect(html).toContain('base-spinner--success');
      expect(html).toContain('base-spinner--lg');
      expect(html).toContain('role="status"');
      // Defaults the accessible label when none is supplied.
      expect(html).toContain('aria-label="Loading…"');
    }
  });

  it('honours an explicit label on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSpinner, { label: 'Fetching' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSpinner, { label: 'Fetching' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Fetching"');
    }
  });
});
