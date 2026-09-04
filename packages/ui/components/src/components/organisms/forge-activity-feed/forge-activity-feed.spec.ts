import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeActivityFeed, type ActivityItem } from './forge-activity-feed';

const ReactActivityFeed = toReactComponent(ForgeActivityFeed, 'ActivityFeed');
const VueActivityFeed = toVueComponent(ForgeActivityFeed, 'ActivityFeed');
const items: ActivityItem[] = [
  {
    user: { name: 'Taylor' },
    action: 'uploaded',
    target: 'a file',
    timestamp: '2026-08-24',
    icon: '↑',
    type: 'upload',
  },
  {
    user: { name: 'Morgan' },
    action: 'reviewed',
    target: 'the pull request',
    timestamp: '2026-08-23',
    type: 'review',
  },
];

describe('ForgeActivityFeed', () => {
  it.each(['react', 'vue'])('renders an accessible activity list on %s', async (framework) => {
    const html =
      framework === 'react'
        ? renderToStaticMarkup(createElement(ReactActivityFeed, { items, ariaLabel: 'Recent changes' }))
        : await renderToString(
            createSSRApp({ render: () => vueH(VueActivityFeed, { items, ariaLabel: 'Recent changes' }) }),
          );
    expect(html).toContain('aria-label="Recent changes"');
    expect(html).toContain('<ol');
    expect(html).toContain('<strong>Taylor</strong> uploaded a file');
    expect(html).toContain('↑');
    expect(html).toContain('<time');
  });

  it('renders the empty and loading states', () => {
    const empty = renderToStaticMarkup(createElement(ReactActivityFeed, { items: [] }));
    const loading = renderToStaticMarkup(createElement(ReactActivityFeed, { items: [], loading: true }));
    expect(empty).toContain('No activity yet');
    expect(loading).toContain('role="status"');
  });

  it('limits rendered items and exposes load more', () => {
    const html = renderToStaticMarkup(createElement(ReactActivityFeed, { items, maxItems: 1, loadMore: true }));
    expect(html).toContain('Taylor');
    expect(html).not.toContain('Morgan');
    expect(html).toContain('Load more');
  });
});
