import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeShortcutHint } from './forge-shortcut-hint';

const ReactShortcutHint = toReactComponent(ForgeShortcutHint, 'ShortcutHint');
const VueShortcutHint = toVueComponent(ForgeShortcutHint, 'ShortcutHint');

describe('ForgeShortcutHint authors the same component for React and Vue', () => {
  it('renders the label and every shortcut key on both frameworks', async () => {
    const properties = { label: 'Open command menu', keys: ['⌘', 'K'] };
    const react = renderToStaticMarkup(createElement(ReactShortcutHint, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueShortcutHint, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Open command menu');
      expect(html).toContain('<kbd');
      expect(html).toContain('⌘');
      expect(html).toContain('K');
      expect(html).toContain('aria-label="Open command menu: ⌘ + K"');
    }
  });

  it('does not render empty key elements when no keys are supplied', async () => {
    const properties = { label: 'Search', keys: [] };
    const react = renderToStaticMarkup(createElement(ReactShortcutHint, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueShortcutHint, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Search');
      expect(html).not.toContain('<kbd');
    }
  });
});
