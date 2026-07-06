import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseCheckbox } from './base-checkbox';

/**
 * Exercises the **neutral** `BaseCheckbox` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the checked state, the label, and the error/hint association.
 */
const ReactCheckbox = toReactComponent(BaseCheckbox, 'Checkbox');
const VueCheckbox = toVueComponent(BaseCheckbox, 'Checkbox');

describe('BaseCheckbox authors the same component for React and Vue', () => {
  it('renders a checked checkbox with its label on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactCheckbox, { modelValue: true, label: 'Accept terms', id: 'cb-1' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueCheckbox, { modelValue: true, label: 'Accept terms', id: 'cb-1' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('Accept terms');
      // The control is checked.
      expect(html).toMatch(/checked/);
      expect(html).toContain('id="cb-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: false, label: 'Subscribe', error: 'This field is required', id: 'cb-2' };
    const react = renderToStaticMarkup(createElement(ReactCheckbox, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCheckbox, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('This field is required');
      expect(html).toContain('aria-describedby="cb-2-error"');
      expect(html).toContain('id="cb-2-error"');
      expect(html).toContain('role="alert"');
    }
  });

  it('toggles a value within a group array on both frameworks', async () => {
    const properties = { modelValue: ['a', 'b'], value: 'a', label: 'Option A', id: 'cb-3' };
    const react = renderToStaticMarkup(createElement(ReactCheckbox, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCheckbox, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('value="a"');
      expect(html).toMatch(/checked/);
    }
  });
});
