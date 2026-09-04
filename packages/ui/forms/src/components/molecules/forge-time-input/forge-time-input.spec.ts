import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTimeInput } from './forge-time-input';

/**
 * Exercises the **neutral** `ForgeTimeInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * The time-list popover opens on the client, so the SSR markup is the trigger
 * shell: the formatted value/placeholder, the dialog affordance, and the error
 * wiring must match across React and Vue.
 */
const ReactTimeInput = toReactComponent(ForgeTimeInput, 'TimeInput');
const VueTimeInput = toVueComponent(ForgeTimeInput, 'TimeInput');

describe('ForgeTimeInput authors the same component for React and Vue', () => {
  it('renders the trigger with its formatted value on both frameworks', async () => {
    const properties = { modelValue: '09:30', label: 'Start time', id: 'tm-1' };
    const react = renderToStaticMarkup(createElement(ReactTimeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Start time');
      expect(html).toContain('09:30');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('id="tm-1"');
    }
  });

  it('renders the HH:MM:SS placeholder when showSeconds and empty on both frameworks', async () => {
    const properties = { modelValue: '', label: 'Time', showSeconds: true, id: 'tm-2' };
    const react = renderToStaticMarkup(createElement(ReactTimeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('HH:MM:SS');
      expect(html).toContain('for="tm-2"');
    }
  });
});
