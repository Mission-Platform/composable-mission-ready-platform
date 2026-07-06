import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDateInput } from './base-date-input';

/**
 * Exercises the **neutral** `BaseDateInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * The popover calendar opens on the client, so the SSR markup is the trigger
 * shell: the formatted value/placeholder, the dialog affordance, and the error
 * wiring must match across React and Vue.
 */
const ReactDateInput = toReactComponent(BaseDateInput, 'DateInput');
const VueDateInput = toVueComponent(BaseDateInput, 'DateInput');

describe('BaseDateInput authors the same component for React and Vue', () => {
  it('renders the trigger with its value and dialog affordance on both frameworks', async () => {
    const properties = { modelValue: '2026-01-15', label: 'Start date', id: 'dt-1' };
    const react = renderToStaticMarkup(createElement(ReactDateInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Start date');
      expect(html).toContain('2026-01-15');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('id="dt-1"');
      expect(html).toContain('for="dt-1"');
    }
  });

  it('shows the placeholder and wires the error on both frameworks', async () => {
    const properties = { modelValue: '', label: 'Date', placeholder: 'Pick a date', error: 'Required', id: 'dt-2' };
    const react = renderToStaticMarkup(createElement(ReactDateInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a date');
      expect(html).toContain('Required');
      expect(html).toContain('aria-describedby="dt-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });
});
