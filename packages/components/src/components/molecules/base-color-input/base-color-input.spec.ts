import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseColorInput } from './base-color-input';

/**
 * Exercises the **neutral** `BaseColorInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the swatch + hex value, the label association, and the error wiring.
 */
const ReactColorInput = toReactComponent(BaseColorInput, 'ColorInput');
const VueColorInput = toVueComponent(BaseColorInput, 'ColorInput');

describe('BaseColorInput authors the same component for React and Vue', () => {
  it('renders the colour swatch and hex field with its value on both frameworks', async () => {
    const properties = { modelValue: '#ff8800', label: 'Brand colour', id: 'col-1' };
    const react = renderToStaticMarkup(createElement(ReactColorInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueColorInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Brand colour');
      expect(html).toContain('type="color"');
      expect(html).toContain('value="#ff8800"');
      expect(html).toContain('id="col-1"');
      expect(html).toContain('for="col-1-text"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: '#000000', label: 'Colour', error: 'Pick a colour', id: 'col-2' };
    const react = renderToStaticMarkup(createElement(ReactColorInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueColorInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a colour');
      expect(html).toContain('aria-describedby="col-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });
});
