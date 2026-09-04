import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeAlertBanner } from './forge-alert-banner';

/**
 * Exercises the **neutral** `ForgeAlertBanner` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the variant role/glyph, the title + default-slot message
 * (via the composed `ForgeTypography`), the dismiss button, and controlled
 * visibility.
 */
const ReactAlertBanner = toReactComponent(ForgeAlertBanner, 'AlertBanner');
const VueAlertBanner = toVueComponent(ForgeAlertBanner, 'AlertBanner');

describe('ForgeAlertBanner authors the same component for React and Vue', () => {
  it('renders an assertive error banner with a title, message, and dismiss button on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactAlertBanner, { variant: 'error', title: 'Failed', dismissible: true }, 'Something broke'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueAlertBanner, { variant: 'error', title: 'Failed', dismissible: true }, () => 'Something broke'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-alert-banner');
      expect(html).toContain('forge-alert-banner--error');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('Failed');
      expect(html).toContain('Something broke');
      expect(html).toContain('aria-label="Dismiss"');
      // The error status icon is drawn with the `@mission-platform/icons` set.
      expect(html).toContain('forge-icon-error');
    }
  });

  it('renders nothing when modelValue is false on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactAlertBanner, { modelValue: false }, 'Hidden'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueAlertBanner, { modelValue: false }, () => 'Hidden') }),
    );

    for (const html of [react, vue]) {
      expect(html).not.toContain('forge-alert-banner--info');
      expect(html).not.toContain('Hidden');
    }
  });
});
