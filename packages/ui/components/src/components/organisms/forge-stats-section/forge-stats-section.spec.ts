import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeStatsSection } from './forge-stats-section';

const ReactStats = toReactComponent(ForgeStatsSection, 'StatsSection');
const VueStats = toVueComponent(ForgeStatsSection, 'StatsSection');

describe('ForgeStatsSection', () => {
  it('renders a labelled statistics section with values and labels on both frameworks', async () => {
    const properties = {
      title: 'At a glance',
      stats: [{ id: 'users', value: '10k', label: 'Users' }],
      columns: 3,
      animated: true,
      variant: 'cards' as const,
    };
    const react = renderToStaticMarkup(createElement(ReactStats, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStats, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('At a glance');
      expect(html).toContain('10k');
      expect(html).toContain('Users');
      expect(html).toContain('aria-label="At a glance"');
      expect(html).toContain('forge-stats-section--cards');
    }
  });
});
