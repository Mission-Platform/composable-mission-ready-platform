import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTimeRangeInput } from './forge-time-range-input';

/**
 * Exercises the **neutral** `ForgeTimeRangeInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * The dual time-list popover opens on the client, so the SSR markup is the
 * trigger shell with the `start → end` summary and the error wiring.
 */
const ReactTimeRangeInput = toReactComponent(ForgeTimeRangeInput, 'TimeRangeInput');
const VueTimeRangeInput = toVueComponent(ForgeTimeRangeInput, 'TimeRangeInput');

describe('ForgeTimeRangeInput authors the same component for React and Vue', () => {
  it('renders the trigger with the range summary on both frameworks', async () => {
    const properties = { modelValue: { start: '09:00', end: '17:30' }, label: 'Shift', id: 'tr-1' };
    const react = renderToStaticMarkup(createElement(ReactTimeRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Shift');
      expect(html).toContain('09:00');
      expect(html).toContain('17:30');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('id="tr-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = { modelValue: { start: '', end: '' }, label: 'Hours', error: 'Pick a range', id: 'tr-2' };
    const react = renderToStaticMarkup(createElement(ReactTimeRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a range');
      expect(html).toContain('aria-describedby="tr-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });
});
