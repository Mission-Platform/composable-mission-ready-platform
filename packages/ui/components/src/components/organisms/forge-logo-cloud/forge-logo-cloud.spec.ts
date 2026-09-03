import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeLogoCloud } from './forge-logo-cloud';

const ReactLogoCloud = toReactComponent(ForgeLogoCloud, 'LogoCloud');
const VueLogoCloud = toVueComponent(ForgeLogoCloud, 'LogoCloud');

describe('ForgeLogoCloud', () => {
  it('renders linked logos with meaningful alternative text on both frameworks', async () => {
    const properties = {
      logos: [{ id: 'acme', name: 'Acme', src: '/acme.svg', href: '/acme' }],
      title: 'Customers',
      variant: 'compact' as const,
      columns: 3,
    };
    const react = renderToStaticMarkup(createElement(ReactLogoCloud, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueLogoCloud, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Customers');
      expect(html).toContain('alt="Acme"');
      expect(html).toContain('href="/acme"');
      expect(html).toContain('forge-logo-cloud--compact');
    }
  });
});
