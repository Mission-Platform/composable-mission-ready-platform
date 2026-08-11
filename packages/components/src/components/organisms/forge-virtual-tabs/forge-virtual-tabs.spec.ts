import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeVirtualTabs } from './forge-virtual-tabs';

import type { TabItem } from '@/components/molecules/forge-tabs';

/**
 * Exercises the **neutral** `ForgeVirtualTabs` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Confirms only the active panel is mounted and the tab roles/scoped
 * panel slot are present.
 */
const ReactVirtualTabs = toReactComponent(ForgeVirtualTabs, 'VirtualTabs');
const VueVirtualTabs = toVueComponent(ForgeVirtualTabs, 'VirtualTabs');

const tabs: TabItem[] = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second' },
];

describe('ForgeVirtualTabs authors the same component for React and Vue', () => {
  it('renders only the active tab panel on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactVirtualTabs, {
        tabs,
        modelValue: 'b',
        panel: ({ tab }: { tab: TabItem }) => `Only ${tab.label}`,
      }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueVirtualTabs, {
            tabs,
            modelValue: 'b',
            panel: ({ tab }: { tab: TabItem }) => `Only ${tab.label}`,
          }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('panel-b');
      expect(html).toContain('Only Second');
      // The inactive panel content is never rendered.
      expect(html).not.toContain('Only First');
    }
  });
});
