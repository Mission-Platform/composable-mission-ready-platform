import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgePricingTable } from './forge-pricing-table';

const ReactPricingTable = toReactComponent(ForgePricingTable, 'PricingTable');
const VuePricingTable = toVueComponent(ForgePricingTable, 'PricingTable');

describe('ForgePricingTable', () => {
  it('renders plans, features, and selection controls on both frameworks', async () => {
    const properties = {
      plans: [{ id: 'starter', name: 'Starter', price: 9, features: ['Email support'] }],
      currency: '€',
      billingToggle: true,
      annualDiscount: 20,
    };
    const react = renderToStaticMarkup(createElement(ReactPricingTable, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VuePricingTable, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Starter');
      expect(html).toContain('€9');
      expect(html).toContain('Email support');
      expect(html).toContain('aria-label="Choose Starter"');
      expect(html).toContain('Annual');
      expect(html).toContain('20%');
    }
  });
});
