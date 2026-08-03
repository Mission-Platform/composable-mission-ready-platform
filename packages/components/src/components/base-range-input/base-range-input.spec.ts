import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseRangeInput, type RangeValue } from './base-range-input';

/**
 * Exercises the **neutral** `BaseRangeInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the dual `role="slider"` thumbs, the ordered bounds, and the value
 * badges — the parity surface of the `@mission-platform/components` SFC.
 */
const ReactRangeInput = toReactComponent(BaseRangeInput, 'RangeInput');
const VueRangeInput = toVueComponent(BaseRangeInput, 'RangeInput');

describe('BaseRangeInput authors the same component for React and Vue', () => {
  it('renders two slider thumbs reflecting the ordered bounds on both frameworks', async () => {
    const properties = { modelValue: [20, 80] as RangeValue, min: 0, max: 100, showValue: true };
    const react = renderToStaticMarkup(createElement(ReactRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-valuenow="20"');
      expect(html).toContain('aria-valuenow="80"');
      expect(html).toContain('aria-valuemax="100"');
      expect(html).toContain('base-range-input__fill');
    }
  });

  it('orders the bounds and exposes aria labels on both frameworks', async () => {
    const properties = {
      modelValue: [90, 10] as RangeValue,
      ariaLabelMin: 'Lowest price',
      ariaLabelMax: 'Highest price',
    };
    const react = renderToStaticMarkup(createElement(ReactRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-valuenow="10"');
      expect(html).toContain('aria-valuenow="90"');
      expect(html).toContain('aria-label="Lowest price"');
      expect(html).toContain('aria-label="Highest price"');
    }
  });
});
