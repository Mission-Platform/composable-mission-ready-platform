import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseSelect } from './base-select';

/**
 * Exercises the **neutral** `BaseSelect` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the combobox trigger, the hidden native select, and the error
 * association. The option listbox is rendered through `BaseDropdown`, whose
 * panel is mounted only while open, so the closed (default) SSR render exposes
 * the option labels through the always-present native `<select>` rather than a
 * `role="listbox"`.
 */
const ReactSelect = toReactComponent(BaseSelect, 'Select');
const VueSelect = toVueComponent(BaseSelect, 'Select');

const OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue', disabled: true },
];

describe('BaseSelect authors the same component for React and Vue', () => {
  it('renders the combobox trigger and the option labels on both frameworks', async () => {
    const properties = { options: OPTIONS, label: 'Colour', modelValue: 'green', id: 'sel-1' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="combobox"');
      // The selected option's label shows in the trigger.
      expect(html).toContain('Green');
      // Every option appears (in the hidden native select while the dropdown is closed).
      expect(html).toContain('Red');
      expect(html).toContain('Blue');
      // The dropdown is closed by default, so its listbox panel is not mounted.
      expect(html).not.toContain('role="listbox"');
      expect(html).toContain('aria-expanded="false"');
    }
  });

  it('mirrors the value into the hidden native select on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', name: 'colour', id: 'sel-2' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('name="colour"');
      // The selected option's label is shown in the combobox trigger.
      expect(html).toContain('Green');
    }
  });

  it('shows the placeholder when nothing is selected on both frameworks', async () => {
    const properties = { options: OPTIONS, placeholder: 'Choose a colour', id: 'sel-3' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Choose a colour');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { options: OPTIONS, error: 'Selection required', id: 'sel-4' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Selection required');
      expect(html).toContain('aria-describedby="sel-4-error"');
      expect(html).toContain('role="alert"');
    }
  });
});
