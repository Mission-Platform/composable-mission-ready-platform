import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeComparisonTable, type ComparisonItem, type FeatureRow } from './forge-comparison-table';

const ReactComparisonTable = toReactComponent(ForgeComparisonTable, 'ComparisonTable');
const VueComparisonTable = toVueComponent(ForgeComparisonTable, 'ComparisonTable');
const items: ComparisonItem[] = [
  { id: 'basic', name: 'Basic' },
  { id: 'pro', name: 'Pro' },
];
const features: FeatureRow[] = [
  { id: 'users', label: 'Users', values: { basic: 3, pro: 'Unlimited' } },
  { id: 'support', label: 'Support', values: { basic: false, pro: true } },
];

describe('ForgeComparisonTable', () => {
  it('renders semantic plan headers and feature rows on both frameworks', async () => {
    const properties = { items, features, highlightBest: true, stickyHeader: true, ariaLabel: 'Product plans' };
    const react = renderToStaticMarkup(createElement(ReactComparisonTable, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueComparisonTable, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Product plans"');
      expect(html).toContain('scope="col"');
      expect(html).toContain('scope="row"');
      expect(html).toContain('Unlimited');
      expect(html).toContain('Included');
      expect(html).toContain('Pro');
      expect(html).toContain('forge-comparison-table--sticky-header');
    }
  });
});
