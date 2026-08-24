import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeAnnouncementBar } from './forge-announcement-bar';

const ReactAnnouncementBar = toReactComponent(ForgeAnnouncementBar, 'AnnouncementBar');
const VueAnnouncementBar = toVueComponent(ForgeAnnouncementBar, 'AnnouncementBar');

describe('ForgeAnnouncementBar', () => {
  it('renders the message, action, and dismiss control on both frameworks', async () => {
    const properties = {
      message: 'A new version is ready.',
      link: { label: 'View release', href: '/release' },
    };
    const react = renderToStaticMarkup(createElement(ReactAnnouncementBar, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueAnnouncementBar, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('role="status"');
      expect(html).toContain('A new version is ready.');
      expect(html).toContain('View release');
      expect(html).toContain('href="/release"');
      expect(html).toContain('aria-label="Dismiss announcement"');
    }
  });

  it('can omit the dismiss affordance', () => {
    const html = renderToStaticMarkup(
      createElement(ReactAnnouncementBar, { message: 'Persistent notice', dismissible: false }),
    );
    expect(html).not.toContain('Dismiss announcement');
  });

  it('uses the storage key to persist dismissal', () => {
    const html = renderToStaticMarkup(
      createElement(ReactAnnouncementBar, { message: 'Stored notice', storageKey: 'notice-v1' }),
    );
    expect(html).toContain('Stored notice');
  });
});
