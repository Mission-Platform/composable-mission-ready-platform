import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSiteFooter } from './forge-site-footer';

const ReactFooter = toReactComponent(ForgeSiteFooter, 'SiteFooter');
const VueFooter = toVueComponent(ForgeSiteFooter, 'SiteFooter');

describe('ForgeSiteFooter', () => {
  it('renders labelled link groups and copyright content on both frameworks', async () => {
    const properties = {
      logo: 'Mission',
      columns: [{ title: 'Company', links: [{ label: 'About', href: '/about' }] }],
      socials: [{ id: 'github', label: 'GitHub', href: '/github' }],
      newsletter: true,
      copyright: '© 2026 Mission',
    };
    const react = renderToStaticMarkup(createElement(ReactFooter, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFooter, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('<footer');
      expect(html).toContain('Company');
      expect(html).toContain('About');
      expect(html).toContain('GitHub');
      expect(html).toContain('Stay in the loop');
      expect(html).toContain('© 2026 Mission');
    }
  });
});
