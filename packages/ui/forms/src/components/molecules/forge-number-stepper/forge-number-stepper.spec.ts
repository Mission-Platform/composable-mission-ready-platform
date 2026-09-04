import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeNumberStepper } from './forge-number-stepper';

/**
 * Exercises the **neutral** `ForgeNumberStepper` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the value display, the decrement/increment buttons, and the
 * min/max bounds.
 */
const ReactStepper = toReactComponent(ForgeNumberStepper, 'NumberStepper');
const VueStepper = toVueComponent(ForgeNumberStepper, 'NumberStepper');

describe('ForgeNumberStepper authors the same component for React and Vue', () => {
  it('renders the value and the −/+ buttons on both frameworks', async () => {
    const properties = { modelValue: 5, label: 'Quantity', id: 'ns-1' };
    const react = renderToStaticMarkup(createElement(ReactStepper, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStepper, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Quantity');
      expect(html).toContain('type="number"');
      expect(html).toContain('value="5"');
      expect(html).toContain('aria-label="Decrease"');
      expect(html).toContain('aria-label="Increase"');
    }
  });

  it('disables decrement at the minimum bound on both frameworks', async () => {
    const properties = { modelValue: 0, min: 0, id: 'ns-2' };
    const react = renderToStaticMarkup(createElement(ReactStepper, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStepper, properties) }));

    for (const html of [react, vue]) {
      // The decrement button is disabled because the value is at the minimum.
      expect(html).toContain('aria-label="Decrease"');
      expect(html).toContain('disabled');
    }
  });

  it('renders an empty field for a null value on both frameworks', async () => {
    const properties = { modelValue: undefined, label: 'Amount', placeholder: '0', id: 'ns-3' };
    const react = renderToStaticMarkup(createElement(ReactStepper, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStepper, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('placeholder="0"');
      expect(html).toContain('type="number"');
      // The field shows no numeric value when the model is null.
      expect(html).not.toMatch(/value="\d/);
    }
  });
});
