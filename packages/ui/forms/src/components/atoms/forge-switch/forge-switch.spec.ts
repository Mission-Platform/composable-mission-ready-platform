import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSwitch } from './forge-switch';

/**
 * Exercises the **neutral** `ForgeSwitch` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the `role="switch"` semantics, the on state, and the label.
 */
const ReactSwitch = toReactComponent(ForgeSwitch, 'Switch');
const VueSwitch = toVueComponent(ForgeSwitch, 'Switch');

describe('ForgeSwitch authors the same component for React and Vue', () => {
  it('renders an on switch with its label on both frameworks', async () => {
    const properties = { modelValue: true, label: 'Notifications', id: 'sw-1' };
    const react = renderToStaticMarkup(createElement(ReactSwitch, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSwitch, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="switch"');
      expect(html).toContain('Notifications');
      expect(html).toContain('aria-checked="true"');
      expect(html).toMatch(/checked/);
      expect(html).toContain('id="sw-1"');
    }
  });

  it('uses ariaLabel when no visible label is given on both frameworks', async () => {
    const properties = { modelValue: false, ariaLabel: 'Dark mode' };
    const react = renderToStaticMarkup(createElement(ReactSwitch, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSwitch, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Dark mode"');
      expect(html).toContain('aria-checked="false"');
    }
  });
});
