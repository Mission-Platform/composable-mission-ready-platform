import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseToast } from './base-toast';

/**
 * Exercises the **neutral** `BaseToast` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the variant role/glyph, the title + message, and the dismiss button.
 */
const ReactToast = toReactComponent(BaseToast, 'Toast');
const VueToast = toVueComponent(BaseToast, 'Toast');

describe('BaseToast authors the same component for React and Vue', () => {
  it('renders a titled, assertive error toast with a dismiss button on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactToast, { variant: 'error', title: 'Upload failed', message: 'Try again' }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueToast, { variant: 'error', title: 'Upload failed', message: 'Try again' }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-toast');
      expect(html).toContain('base-toast--error');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('Upload failed');
      expect(html).toContain('Try again');
      expect(html).toContain('aria-label="Dismiss"');
      expect(html).toContain('base-icon-error');
    }
  });

  it('omits the dismiss button when not dismissible on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactToast, { variant: 'success', dismissible: false }, 'Saved'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueToast, { variant: 'success', dismissible: false }, () => 'Saved') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-toast--success');
      expect(html).toContain('Saved');
      expect(html).not.toContain('aria-label="Dismiss"');
    }
  });
});
