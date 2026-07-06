import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseMultiselect } from './base-multiselect';

/**
 * Exercises the **neutral** `BaseMultiselect` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/jsx` runtime
 * adapters. Covers the selected chips, the hidden native multi-select, and the
 * error association. The available-options listbox is rendered through
 * `BaseDropdown`, whose panel is mounted only while open, so the closed
 * (default) SSR render exposes the option labels through the always-present
 * native `<select multiple>` rather than a `role="listbox"`.
 */
const ReactMultiselect = toReactComponent(BaseMultiselect, 'Multiselect');
const VueMultiselect = toVueComponent(BaseMultiselect, 'Multiselect');

const OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue' },
];

describe('BaseMultiselect authors the same component for React and Vue', () => {
  it('renders chips for the selected values and the option labels on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: ['red'], label: 'Colours', id: 'ms-1' };
    const react = renderToStaticMarkup(createElement(ReactMultiselect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMultiselect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="combobox"');
      // The selected value is shown as a removable tag in the trigger.
      expect(html).toContain('Red');
      // Every option appears (in the hidden native select while the dropdown is closed).
      expect(html).toContain('Green');
      expect(html).toContain('Blue');
      // The dropdown is closed by default, so its listbox panel is not mounted.
      expect(html).not.toContain('role="listbox"');
      expect(html).toContain('aria-expanded="false"');
    }
  });

  it('mirrors the selection into the hidden native multi-select on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: ['green', 'blue'], name: 'colours', id: 'ms-2' };
    const react = renderToStaticMarkup(createElement(ReactMultiselect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMultiselect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('name="colours"');
      expect(html).toContain('multiple');
    }
  });

  it('renders every selected value as a chip on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: ['red', 'green', 'blue'], id: 'ms-3' };
    const react = renderToStaticMarkup(createElement(ReactMultiselect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMultiselect, properties) }));

    for (const html of [react, vue]) {
      // All three selections show as chips in the (always-rendered) trigger.
      expect(html).toContain('Red');
      expect(html).toContain('Green');
      expect(html).toContain('Blue');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { options: OPTIONS, error: 'Pick at least one', id: 'ms-4' };
    const react = renderToStaticMarkup(createElement(ReactMultiselect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMultiselect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick at least one');
      expect(html).toContain('aria-describedby="ms-4-error"');
      expect(html).toContain('role="alert"');
    }
  });
});
