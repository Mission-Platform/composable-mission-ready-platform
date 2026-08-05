import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDateRangeInput } from './forge-date-range-input';

/**
 * Exercises the **neutral** `ForgeDateRangeInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * The dual-calendar popover opens on the client, so the SSR markup is the
 * trigger shell with the `start → end` summary and the error wiring.
 */
const ReactDateRangeInput = toReactComponent(ForgeDateRangeInput, 'DateRangeInput');
const VueDateRangeInput = toVueComponent(ForgeDateRangeInput, 'DateRangeInput');

describe('ForgeDateRangeInput authors the same component for React and Vue', () => {
  it('renders the trigger with the range summary on both frameworks', async () => {
    const properties = { modelValue: { start: '2026-01-10', end: '2026-01-20' }, label: 'Trip', id: 'dr-1' };
    const react = renderToStaticMarkup(createElement(ReactDateRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Trip');
      expect(html).toContain('2026-01-10');
      expect(html).toContain('2026-01-20');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('id="dr-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: { start: '', end: '' }, label: 'Range', error: 'Pick a range', id: 'dr-2' };
    const react = renderToStaticMarkup(createElement(ReactDateRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a range');
      expect(html).toContain('aria-describedby="dr-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });
});
