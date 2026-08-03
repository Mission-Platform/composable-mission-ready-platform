import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseRadio } from './base-radio';

/**
 * Exercises the **neutral** `BaseRadio` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the selected state, the label, and the disabled state.
 */
const ReactRadio = toReactComponent(BaseRadio, 'Radio');
const VueRadio = toVueComponent(BaseRadio, 'Radio');

describe('BaseRadio authors the same component for React and Vue', () => {
  it('renders a selected radio with its label on both frameworks', async () => {
    const properties = { modelValue: 'a', value: 'a', label: 'Option A' };
    const react = renderToStaticMarkup(createElement(ReactRadio, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRadio, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="radio"');
      expect(html).toContain('value="a"');
      expect(html).toContain('Option A');
      expect(html).toMatch(/checked/);
    }
  });

  it('renders an unselected, disabled radio on both frameworks', async () => {
    const properties = { modelValue: 'a', value: 'b', label: 'Option B', disabled: true };
    const react = renderToStaticMarkup(createElement(ReactRadio, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueRadio, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('value="b"');
      expect(html).toContain('disabled');
      expect(html).not.toMatch(/checked=/);
    }
  });
});
