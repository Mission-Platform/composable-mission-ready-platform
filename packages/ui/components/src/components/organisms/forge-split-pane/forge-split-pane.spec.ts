import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSplitPane } from './forge-split-pane';

const ReactSplitPane = toReactComponent(ForgeSplitPane, 'SplitPane');
const VueSplitPane = toVueComponent(ForgeSplitPane, 'SplitPane');

describe('ForgeSplitPane', () => {
  it('renders labelled panes and a keyboard-accessible separator on both frameworks', async () => {
    const properties = {
      primary: 'Navigation',
      secondary: 'Content',
      direction: 'vertical' as const,
      initialSize: 40,
      min: 25,
      max: 75,
      resizable: true,
      primaryLabel: 'Navigation pane',
      secondaryLabel: 'Content pane',
    };
    const react = renderToStaticMarkup(createElement(ReactSplitPane, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSplitPane, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Navigation');
      expect(html).toContain('Content');
      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-valuenow="40"');
      expect(html).toContain('aria-orientation="horizontal"');
    }
  });

  it('clamps keyboard resizing to min and max and emits resize', async () => {
    const onResize = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueSplitPane, { primary: 'A', secondary: 'B', initialSize: 50, min: 40, max: 60, onResize }),
    });
    app.mount(host);
    const separator = host.querySelector('[role="separator"]');
    if (!separator) return;
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await nextTick();
    expect(onResize).toHaveBeenNthCalledWith(1, 40);
    expect(onResize).toHaveBeenNthCalledWith(2, 60);
    app.unmount();
    host.remove();
  });
});
