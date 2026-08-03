import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseInput } from './base-input';

/**
 * Exercises the **neutral** `BaseInput` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the value, the label association, the error wiring, and the datalist.
 */
const ReactInput = toReactComponent(BaseInput, 'Input');
const VueInput = toVueComponent(BaseInput, 'Input');

describe('BaseInput authors the same component for React and Vue', () => {
  it('renders a labelled text field with its value on both frameworks', async () => {
    const properties = { modelValue: 'Ada', label: 'Name', placeholder: 'Your name', id: 'in-1' };
    const react = renderToStaticMarkup(createElement(ReactInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Name');
      expect(html).toContain('value="Ada"');
      expect(html).toContain('placeholder="Your name"');
      expect(html).toContain('id="in-1"');
      expect(html).toContain('for="in-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: '', label: 'Email', type: 'email' as const, error: 'Invalid email', id: 'in-2' };
    const react = renderToStaticMarkup(createElement(ReactInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="email"');
      expect(html).toContain('Invalid email');
      expect(html).toContain('aria-describedby="in-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });

  it('renders a datalist from the list prop on both frameworks', async () => {
    const properties = { modelValue: '', label: 'Fruit', list: ['Apple', 'Banana'], id: 'in-3' };
    const react = renderToStaticMarkup(createElement(ReactInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('id="in-3-list"');
      expect(html).toContain('list="in-3-list"');
      expect(html).toContain('value="Apple"');
      expect(html).toContain('value="Banana"');
    }
  });
});
