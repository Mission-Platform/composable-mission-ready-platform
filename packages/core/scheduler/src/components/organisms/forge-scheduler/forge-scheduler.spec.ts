import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeScheduler, type VEvent } from './forge-scheduler';

/**
 * Exercises the **neutral** `ForgeScheduler` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` adapters. Like the
 * Vue original it is driven by RFC 5545 `VEvent`s and the scheduler package
 * core (view ranges, recurrence expansion,
 * collision layout), so the day/week/month/year grids must render identically
 * across React and Vue.
 */
const ReactScheduler = toReactComponent(ForgeScheduler, 'Scheduler');
const VueScheduler = toVueComponent(ForgeScheduler, 'Scheduler');

/** Local-time ISO `YYYY-MM-DDTHH:mm:00` for today at the given time. */
function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// The scheduler anchors to *today*, so the sample event is placed today (09:00–
// 10:30) to keep it inside every view's visible range deterministically.
const EVENTS: VEvent[] = [
  {
    uid: 'a',
    dtstamp: '2024-01-01T00:00:00Z',
    dtstart: todayAt(9),
    dtend: todayAt(10, 30),
    summary: 'Standup meeting',
  },
];

async function renderBoth(properties: Record<string, unknown>): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactScheduler, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueScheduler, properties) }));
  return [react, vue];
}

describe('ForgeScheduler authors the same component for React and Vue', () => {
  it('renders the toolbar (Today / new-event / five-view switcher) on both frameworks', async () => {
    for (const html of await renderBoth({ modelValue: EVENTS, defaultView: 'week' })) {
      expect(html).toContain('Today');
      expect(html).toContain('+ New Event');
      for (const label of ['Day', '3 Day', 'Week', 'Month', 'Year']) expect(html).toContain(label);
    }
  });

  it('renders an hour grid + the event chip in a time view', async () => {
    for (const html of await renderBoth({ modelValue: EVENTS, defaultView: 'day' })) {
      // Hour-gutter labels prove the time grid rendered.
      expect(html).toContain('9 AM');
      expect(html).toContain('12 PM');
      // The event chip + its derived duration (90 min → "1h 30m").
      expect(html).toContain('Standup meeting');
      expect(html).toContain('1h 30m');
    }
  });

  it('renders the month grid with weekday headers + the event chip on both frameworks', async () => {
    for (const html of await renderBoth({ modelValue: EVENTS, defaultView: 'month' })) {
      // A weekday header label (short, localized) proves the month grid rendered.
      expect(html).toContain('Mon');
      // Today's event surfaces as a month chip.
      expect(html).toContain('Standup meeting');
    }
  });

  it('renders all 12 mini-months in the year view on both frameworks', async () => {
    for (const html of await renderBoth({ modelValue: EVENTS, defaultView: 'year' })) {
      for (const month of ['January', 'June', 'December']) expect(html).toContain(month);
    }
  });
});
