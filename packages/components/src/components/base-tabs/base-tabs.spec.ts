import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseTabs, type TabItem } from './base-tabs';

/**
 * Exercises the **neutral** `BaseTabs` authored in this package, rendering it on
 * both frameworks through the `@mission-platform/jsx` runtime adapters. Covers
 * the ARIA `tablist`/`tab`/`tabpanel` roles, the selected tab, the scoped panel
 * render-prop, and the closable/addable affordances.
 */
const ReactTabs = toReactComponent(BaseTabs, 'Tabs');
const VueTabs = toVueComponent(BaseTabs, 'Tabs');

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings', disabled: true },
];

describe('BaseTabs authors the same component for React and Vue', () => {
  it('renders a tablist with the active tab and its panel on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTabs, {
        tabs,
        modelValue: 'details',
        panel: ({ tab }: { tab: TabItem }) => `Panel: ${tab.label}`,
      }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueTabs, {
            tabs,
            modelValue: 'details',
            panel: ({ tab }: { tab: TabItem }) => `Panel: ${tab.label}`,
          }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('Overview');
      expect(html).toContain('Details');
      expect(html).toContain('Panel: Details');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('panel-details');
    }
  });

  it('keeps every panel mounted, hiding the inactive ones (matching the Vue SFC)', async () => {
    const properties = {
      tabs,
      modelValue: 'details',
      panel: ({ tab }: { tab: TabItem }) => `Panel: ${tab.label}`,
    };
    const react = renderToStaticMarkup(createElement(ReactTabs, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTabs, properties) }));

    for (const html of [react, vue]) {
      // A panel exists per tab (not just the active one)…
      expect(html).toContain('panel-overview');
      expect(html).toContain('panel-details');
      expect(html).toContain('panel-settings');
      expect(html).toContain('Panel: Overview');
      expect(html).toContain('Panel: Settings');
      // …and the inactive panels carry the `hidden` attribute.
      expect(html).toContain('hidden');
    }
  });

  it('renders the close and add affordances on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactTabs, { tabs, closable: true, addable: true }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueTabs, { tabs, closable: true, addable: true }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('data-close-tab-id="overview"');
      expect(html).toContain('aria-label="New tab"');
    }
  });
});
