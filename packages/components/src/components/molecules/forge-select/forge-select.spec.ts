import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSelect } from './forge-select';

/**
 * Exercises the **neutral** `ForgeSelect` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the combobox trigger, the hidden native select, and the error
 * association. The option listbox is rendered through `ForgeDropdown`, whose
 * panel is mounted only while open, so the closed (default) SSR render exposes
 * the option labels through the always-present native `<select>` rather than a
 * `role="listbox"`.
 */
const ReactSelect = toReactComponent(ForgeSelect, 'Select');
const VueSelect = toVueComponent(ForgeSelect, 'Select');

const OPTIONS = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue', disabled: true },
];

describe('ForgeSelect authors the same component for React and Vue', () => {
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

  it('renders a searchable text input carrying the selected label by default on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', id: 'sel-5' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      // The trigger is a filtering text field (combobox with list autocomplete).
      expect(html).toContain('aria-autocomplete="list"');
      // The selected option's label seeds the search field so it shows the value.
      expect(html).toContain('value="Green"');
    }
  });

  it('falls back to a plain button trigger when searchable is disabled on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'green', searchable: false, id: 'sel-6' };
    const react = renderToStaticMarkup(createElement(ReactSelect, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSelect, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="button"');
      expect(html).not.toContain('aria-autocomplete="list"');
      // The selected option's label shows in the button trigger.
      expect(html).toContain('Green');
    }
  });
});
