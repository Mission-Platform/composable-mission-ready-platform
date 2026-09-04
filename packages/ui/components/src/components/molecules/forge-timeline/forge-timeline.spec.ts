import { readFileSync } from 'node:fs';
import path from 'node:path';

import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTimeline } from './forge-timeline';

const timelineStyles = readFileSync(
  path.resolve(process.cwd(), 'src/components/molecules/forge-timeline/forge-timeline.module.scss'),
  'utf8',
);

/**
 * Exercises the **neutral** `ForgeTimeline` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the rendered events, the time/title/body, and the orientation class.
 */
const ReactTimeline = toReactComponent(ForgeTimeline, 'Timeline');
const VueTimeline = toVueComponent(ForgeTimeline, 'Timeline');

const ITEMS = [
  { id: 'a', time: '09:00', title: 'Kickoff', body: 'Project started.' },
  { id: 'b', time: '12:00', title: 'Lunch', body: 'Team break.', variant: 'success' as const },
  { id: 'c', time: '17:00', title: 'Wrap up', body: 'End of day.', outlined: true },
];

describe('ForgeTimeline authors the same component for React and Vue', () => {
  it('renders one list item per event with its content on both frameworks', async () => {
    const properties = { items: ITEMS };
    const react = renderToStaticMarkup(createElement(ReactTimeline, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeline, properties) }));

    for (const html of [react, vue]) {
      expect(html.match(/<li/g)).toHaveLength(3);
      expect(html).toContain('Kickoff');
      expect(html).toContain('09:00');
      expect(html).toContain('Project started.');
    }
  });

  it('applies the requested orientation to the list on both frameworks', async () => {
    const properties = { items: ITEMS, orientation: 'horizontal' as const };
    const react = renderToStaticMarkup(createElement(ReactTimeline, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeline, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-timeline--horizontal');
      expect(html).toContain('forge-timeline-item--horizontal');
    }
  });

  it('tints a marker via the item variant on both frameworks', async () => {
    const properties = { items: ITEMS };
    const react = renderToStaticMarkup(createElement(ReactTimeline, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTimeline, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-timeline-item--success');
      expect(html).toContain('forge-timeline-item--outlined');
    }
  });

  it('keeps timeline token aliases resolvable for consumer overrides', () => {
    expect(timelineStyles).not.toContain('--mp-timeline-marker-size: var(--mp-timeline-marker-size)');
    expect(timelineStyles).not.toContain('--mp-timeline-gutter: var(--mp-timeline-gutter)');
    expect(timelineStyles).toContain('var(--mp-timeline-marker-size)');
    expect(timelineStyles).toContain('var(--mp-timeline-gutter)');
  });
});
