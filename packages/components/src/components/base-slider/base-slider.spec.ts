import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSlider } from './base-slider';

/**
 * Exercises the **neutral** `BaseSlider` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the bespoke `role="slider"` thumb, its ARIA range, and the value badge
 * — the parity surface of the `@mission-platform/components` SFC.
 */
const ReactSlider = toReactComponent(BaseSlider, 'Slider');
const VueSlider = toVueComponent(BaseSlider, 'Slider');

describe('BaseSlider authors the same component for React and Vue', () => {
  it('renders a slider thumb with its ARIA range on both frameworks', async () => {
    const properties = { modelValue: 40, min: 0, max: 100, step: 5, ariaLabel: 'Volume' };
    const react = renderToStaticMarkup(createElement(ReactSlider, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSlider, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-label="Volume"');
      expect(html).toContain('aria-valuemin="0"');
      expect(html).toContain('aria-valuemax="100"');
      expect(html).toContain('aria-valuenow="40"');
      // The fill + thumb are positioned at the value's percentage of the track.
      expect(html).toContain('40%');
    }
  });

  it('clamps the value and shows the formatted badge on both frameworks', async () => {
    const properties = {
      modelValue: 250,
      min: 0,
      max: 100,
      showValue: true,
      formatValue: (value: number) => `${value}%`,
    };
    const react = renderToStaticMarkup(createElement(ReactSlider, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSlider, properties) }));

    for (const html of [react, vue]) {
      // 250 is clamped to the max of 100 and formatted.
      expect(html).toContain('aria-valuenow="100"');
      expect(html).toContain('100%');
      expect(html).toContain('aria-valuetext="100%"');
    }
  });
});
