import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMetricCard } from './forge-metric-card';

const ReactMetricCard = toReactComponent(ForgeMetricCard, 'MetricCard');
const VueMetricCard = toVueComponent(ForgeMetricCard, 'MetricCard');

describe('ForgeMetricCard authors the same component for React and Vue', () => {
  it('renders the value and an upward trend on both frameworks', async () => {
    const properties = {
      label: 'Active users',
      value: '12,480',
      trend: { value: '+12%', direction: 'up' as const },
      id: 'metric-users',
    };
    const react = renderToStaticMarkup(createElement(ReactMetricCard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMetricCard, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Active users');
      expect(html).toContain('12,480');
      expect(html).toContain('+12%');
      expect(html).toContain('forge-metric-card__trend--up');
    }
  });

  it('renders a flat trend and an accessible loading state', async () => {
    const properties = {
      label: 'Revenue',
      value: '$0',
      trend: { value: '0%', direction: 'flat' as const },
      loading: true,
    };
    const react = renderToStaticMarkup(createElement(ReactMetricCard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMetricCard, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('role="status"');
      expect(html).toContain('forge-metric-card--loading');
      expect(html).toContain('forge-metric-card__trend--flat');
    }
  });
});
