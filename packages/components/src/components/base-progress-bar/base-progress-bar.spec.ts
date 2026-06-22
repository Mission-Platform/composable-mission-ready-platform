import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseProgressBar } from './base-progress-bar';

/**
 * Exercises the **neutral** `BaseProgressBar` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the determinate label row (via the composed
 * `BaseTypography`) and the indeterminate mode.
 */
const ReactProgressBar = toReactComponent(BaseProgressBar, 'ProgressBar');
const VueProgressBar = toVueComponent(BaseProgressBar, 'ProgressBar');

describe('BaseProgressBar authors the same component for React and Vue', () => {
  it('renders a labelled, determinate track with a percentage on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactProgressBar, { value: 30, variant: 'success', size: 'lg', label: 'Upload', showLabel: true }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueProgressBar, { value: 30, variant: 'success', size: 'lg', label: 'Upload', showLabel: true }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-progress-bar');
      expect(html).toContain('base-progress-bar--lg');
      expect(html).toContain('base-progress-bar__track--success');
      // The composed neutral BaseTypography renders the label + percentage.
      expect(html).toContain('base-typography');
      expect(html).toContain('Upload');
      expect(html).toContain('30%');
      expect(html).toContain('aria-label="Upload"');
    }
  });

  it('renders an indeterminate track without a value on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactProgressBar, { indeterminate: true }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueProgressBar, { indeterminate: true }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-progress-bar__track--indeterminate');
    }
  });
});
