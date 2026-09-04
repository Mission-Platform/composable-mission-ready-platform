import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeCookieConsent } from './forge-cookie-consent';

import type { CookieCategory } from './forge-cookie-consent';

const ReactCookieConsent = toReactComponent(ForgeCookieConsent, 'CookieConsent');
const VueCookieConsent = toVueComponent(ForgeCookieConsent, 'CookieConsent');

const categories: CookieCategory[] = [
  { id: 'analytics', label: 'Analytics', description: 'Helps us improve the product' },
  { id: 'necessary', label: 'Necessary', required: true },
];

describe('ForgeCookieConsent authors the same component for React and Vue', () => {
  it('renders a labelled consent banner with category controls on both frameworks', async () => {
    const properties = { categories, title: 'Privacy choices', description: 'Choose which cookies to allow.' };
    const react = renderToStaticMarkup(createElement(ReactCookieConsent, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCookieConsent, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="region"');
      expect(html).toContain('Privacy choices');
      expect(html).toContain('Analytics');
      expect(html).toContain('Necessary');
      expect(html).toContain('Accept all');
      expect(html).toContain('Reject non-essential');
    }
  });

  it('can start hidden', () => {
    const html = renderToStaticMarkup(createElement(ReactCookieConsent, { categories, defaultOpen: false }));
    expect(html).not.toContain('role="region"');
  });

  it('does not hide the banner for an undecided stored payload', async () => {
    localStorage.setItem(
      'forge-cookie-consent',
      JSON.stringify({ decided: false, categories: {}, timestamp: Date.now() }),
    );
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => vueH(VueCookieConsent, { categories }) });
    app.mount(host);

    await nextTick();
    expect(host.querySelector('[role="region"]')).not.toBeNull();

    app.unmount();
    host.remove();
  });

  it('uses the privacy policy URL and persists accept decisions through localStorage', async () => {
    const onAccept = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueCookieConsent, {
          categories,
          onAccept,
          privacyPolicyUrl: '/privacy',
          storageKey: 'privacy-consent',
        }),
    });
    app.mount(host);

    expect(host.querySelector('a[href="/privacy"]')).not.toBeNull();
    const accept = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('Accept'));
    accept?.click();
    await nextTick();
    await nextTick();

    expect(onAccept).toHaveBeenCalledOnce();
    expect(localStorage.getItem('privacy-consent')).toContain('"decided":true');

    app.unmount();
    host.remove();
  });
});

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});
