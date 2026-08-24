import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCtaBanner, type CtaBannerProperties } from './forge-cta-banner';

const ReactCtaBanner = toReactComponent(ForgeCtaBanner, 'CtaBanner');
const VueCtaBanner = toVueComponent(ForgeCtaBanner, 'CtaBanner');

describe('ForgeCtaBanner', () => {
  it('renders a labelled section and keyboard-accessible actions on both frameworks', async () => {
    const properties: CtaBannerProperties = {
      title: 'Start a project',
      description: 'Everything you need to ship.',
      actions: [{ id: 'start', label: 'Start now' }],
      backgroundImage: '/cta.jpg',
      align: 'center',
    };
    const react = renderToStaticMarkup(createElement(ReactCtaBanner, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCtaBanner, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Call to action"');
      expect(html).toContain('<h2');
      expect(html).toContain('Start now');
      expect(html).toContain('type="button"');
      expect(html).toContain('/cta.jpg');
      expect(html).toContain('forge-cta-banner--center');
    }
  });
});
