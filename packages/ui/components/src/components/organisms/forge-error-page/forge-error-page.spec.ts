import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeErrorPage } from './forge-error-page';

import type { ErrorPageAction } from './forge-error-page';

const ReactErrorPage = toReactComponent(ForgeErrorPage, 'ErrorPage');
const VueErrorPage = toVueComponent(ForgeErrorPage, 'ErrorPage');

const actions: ErrorPageAction[] = [
  { id: 'home', label: 'Back to home', href: '/' },
  { id: 'retry', label: 'Try again' },
];

describe('ForgeErrorPage authors the same component for React and Vue', () => {
  it('renders a semantic error page with action links on both frameworks', async () => {
    const properties = { status: 404, title: 'Page not found', message: 'The page has moved.', actions };
    const react = renderToStaticMarkup(createElement(ReactErrorPage, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueErrorPage, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="main"');
      expect(html).toContain('404');
      expect(html).toContain('Page not found');
      expect(html).toContain('The page has moved.');
      expect(html).toContain('Back to home');
      expect(html).toContain('href="/"');
      expect(html).toContain('Try again');
    }
  });

  it('does not expose disabled link actions as navigable links', () => {
    const html = renderToStaticMarkup(
      createElement(ReactErrorPage, {
        title: 'Unavailable',
        message: 'Try later.',
        actions: [{ id: 'home', label: 'Back to home', href: '/', disabled: true }],
      }),
    );

    expect(html).not.toContain('href="/"');
    expect(html).toContain('aria-disabled="true"');
  });

  it('uses code defaults, the home link, and illustration/actions slots', () => {
    const html = renderToStaticMarkup(
      createElement(ReactErrorPage, {
        actions: 'Custom actions',
        code: 404,
        description: 'The requested mission is missing.',
        homeUrl: '/missions',
        illustration: 'Illustration',
        showHomeLink: true,
      }),
    );

    expect(html).toContain('Page not found');
    expect(html).toContain('The requested mission is missing.');
    expect(html).toContain('Illustration');
    expect(html).toContain('Custom actions');
    expect(html).toContain('href="/missions"');
  });
});
