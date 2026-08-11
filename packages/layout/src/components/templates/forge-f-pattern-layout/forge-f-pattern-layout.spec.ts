import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeFPatternLayout } from './forge-f-pattern-layout';

const ReactFPatternLayout = toReactComponent(ForgeFPatternLayout, 'FPatternLayout');
const VueFPatternLayout = toVueComponent(ForgeFPatternLayout, 'FPatternLayout');

describe('ForgeFPatternLayout authors the same component for React and Vue', () => {
  it('renders the documentation-style reading path in source order on both frameworks', async () => {
    const properties = {
      header: 'Header',
      intro: 'Intro',
      primary: 'Primary',
      secondary: 'Secondary',
      footer: 'Footer',
    };
    const react = renderToStaticMarkup(createElement(ReactFPatternLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFPatternLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('f-pattern-layout');
      expect(html).toContain('f-pattern-layout__header');
      expect(html).toContain('f-pattern-layout__intro');
      expect(html).toContain('f-pattern-layout__primary');
      expect(html).toContain('f-pattern-layout__secondary');
      expect(html).toContain('f-pattern-layout__footer');
      expect(html.indexOf('Header')).toBeLessThan(html.indexOf('Intro'));
      expect(html.indexOf('Intro')).toBeLessThan(html.indexOf('Primary'));
      expect(html.indexOf('Primary')).toBeLessThan(html.indexOf('Secondary'));
      expect(html.indexOf('Secondary')).toBeLessThan(html.indexOf('Footer'));
    }
  });

  it('omits absent secondary and footer wrappers on both frameworks', async () => {
    const properties = { header: 'Header', primary: 'Primary' };
    const react = renderToStaticMarkup(createElement(ReactFPatternLayout, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFPatternLayout, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('f-pattern-layout__header');
      expect(html).toContain('f-pattern-layout__primary');
      expect(html).not.toContain('f-pattern-layout__secondary');
      expect(html).not.toContain('f-pattern-layout__footer');
    }
  });
});
