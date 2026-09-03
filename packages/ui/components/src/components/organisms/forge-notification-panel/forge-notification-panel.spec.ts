import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeNotificationPanel } from './forge-notification-panel';

const ReactPanel = toReactComponent(ForgeNotificationPanel, 'NotificationPanel');
const VuePanel = toVueComponent(ForgeNotificationPanel, 'NotificationPanel');

describe('ForgeNotificationPanel', () => {
  it('renders notifications and dismiss controls accessibly on both frameworks', async () => {
    const properties = {
      notifications: [
        {
          id: 'n1',
          title: 'Build complete',
          message: 'All checks passed',
          type: 'success' as const,
          timestamp: 'Today',
          action: { label: 'View build' },
        },
        { id: 'n2', title: 'Review requested', message: 'Please review', timestamp: 'Yesterday', read: true },
      ],
      unreadCount: 1,
      emptyMessage: 'Nothing here',
    };
    const react = renderToStaticMarkup(createElement(ReactPanel, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VuePanel, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Notifications"');
      expect(html).toContain('Build complete');
      expect(html).toContain('All checks passed');
      expect(html).toContain('aria-label="Dismiss Build complete"');
      expect(html).toContain('Today');
      expect(html).toContain('Yesterday');
      expect(html).toContain('1');
      expect(html).toContain('View build');
      const contentButton = html.match(/<button[^>]*forge-notification-panel__content[^>]*>([\s\S]*?)<\/button>/);
      expect(contentButton?.[1]).not.toContain('<button');
    }
  });

  it('emits read and dismiss events and supports an empty state', async () => {
    const onRead = vi.fn();
    const onDismiss = vi.fn();
    const notification = { id: 'n1', title: 'Build complete', message: 'Done', timestamp: 'Today' };
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => vueH(VuePanel, { notifications: [notification], onRead, onDismiss }) });
    app.mount(host);
    host.querySelector('.forge-notification-panel__content')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(onRead).toHaveBeenCalledWith('n1');
    host.querySelector('.forge-notification-panel__dismiss')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(onDismiss).toHaveBeenCalledWith('n1');
    const emptyHost = document.createElement('div');
    const emptyApp = createApp({ render: () => vueH(VuePanel, { notifications: [], emptyMessage: 'Nothing here' }) });
    emptyApp.mount(emptyHost);
    expect(emptyHost.textContent).toContain('Nothing here');
    emptyApp.unmount();
    app.unmount();
    host.remove();
  });
});
