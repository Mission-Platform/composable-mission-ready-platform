import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDivider } from './forge-divider';

const ReactDivider = toReactComponent(ForgeDivider, 'Divider');
const VueDivider = toVueComponent(ForgeDivider, 'Divider');

async function renderDivider(properties: Record<string, unknown> = {}): Promise<string[]> {
  const react = renderToStaticMarkup(createElement(ReactDivider, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueDivider, properties) }));

  return [react, vue];
}

describe('ForgeDivider authors the same component for React and Vue', () => {
  it('renders a horizontal semantic divider by default', async () => {
    const markup = await renderDivider();

    for (const html of markup) {
      expect(html).toContain('<hr');
      expect(html).toContain('forge-divider');
      expect(html).toContain('forge-divider--horizontal');
      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-orientation="horizontal"');
    }
  });

  it('renders a vertical divider with the matching orientation class and aria attribute', async () => {
    const markup = await renderDivider({ orientation: 'vertical' });

    for (const html of markup) {
      expect(html).toContain('forge-divider--vertical');
      expect(html).toContain('aria-orientation="vertical"');
    }
  });

  it('uses a div role when decorative is false', async () => {
    const markup = await renderDivider({ decorative: false });

    for (const html of markup) {
      expect(html).toContain('<div');
      expect(html).toContain('role="separator"');
      expect(html).not.toContain('aria-orientation');
    }
  });
});
