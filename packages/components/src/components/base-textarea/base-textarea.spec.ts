import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseTextarea } from './base-textarea';

/**
 * Exercises the **neutral** `BaseTextarea` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the value, the rows, the label association, and the error wiring.
 */
const ReactTextarea = toReactComponent(BaseTextarea, 'Textarea');
const VueTextarea = toVueComponent(BaseTextarea, 'Textarea');

describe('BaseTextarea authors the same component for React and Vue', () => {
  it('renders a labelled textarea with its value and rows on both frameworks', async () => {
    const properties = { modelValue: 'Hello', label: 'Bio', rows: 6, id: 'ta-1' };
    const react = renderToStaticMarkup(createElement(ReactTextarea, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTextarea, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('<textarea');
      expect(html).toContain('Bio');
      expect(html).toContain('rows="6"');
      expect(html).toContain('Hello');
      expect(html).toContain('id="ta-1"');
      expect(html).toContain('for="ta-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: '', label: 'Notes', error: 'Too short', id: 'ta-2' };
    const react = renderToStaticMarkup(createElement(ReactTextarea, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTextarea, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Too short');
      expect(html).toContain('aria-describedby="ta-2-error"');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('role="alert"');
    }
  });
});
