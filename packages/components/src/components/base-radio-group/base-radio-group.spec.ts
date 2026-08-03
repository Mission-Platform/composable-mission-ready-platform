import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseRadioGroup } from './base-radio-group';

/**
 * Exercises the **neutral** `BaseRadioGroup` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the legend, the rendered options, the selected state, and the error.
 */
const ReactRadioGroup = toReactComponent(BaseRadioGroup, 'RadioGroup');
const VueRadioGroup = toVueComponent(BaseRadioGroup, 'RadioGroup');

const OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

describe('BaseRadioGroup authors the same component for React and Vue', () => {
  it('renders the legend and one radio per option on both frameworks', async () => {
    const properties = { legend: 'Pick a fruit', options: OPTIONS, modelValue: 'banana' };
    const react = renderToStaticMarkup(createElement(ReactRadioGroup, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRadioGroup, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a fruit');
      expect(html).toContain('Apple');
      expect(html).toContain('Banana');
      expect(html).toContain('Cherry');
      // Three radio controls are rendered.
      expect(html.match(/type="radio"/g)).toHaveLength(3);
    }
  });

  it('marks the selected option as checked on both frameworks', async () => {
    const properties = { options: OPTIONS, modelValue: 'cherry' };
    const react = renderToStaticMarkup(createElement(ReactRadioGroup, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRadioGroup, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('value="cherry"');
      expect(html).toMatch(/checked/);
    }
  });

  it('renders the error message on both frameworks', async () => {
    const properties = { options: OPTIONS, error: 'Please choose one' };
    const react = renderToStaticMarkup(createElement(ReactRadioGroup, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRadioGroup, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Please choose one');
      expect(html).toContain('role="alert"');
    }
  });
});
