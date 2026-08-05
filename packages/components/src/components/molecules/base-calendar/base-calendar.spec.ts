import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseCalendar } from './base-calendar';

/**
 * Exercises the **neutral** `BaseCalendar` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the month label, the weekday header, the selected day, and the
 * disabled-date handling. A fixed `timezone` keeps the rendered grid
 * deterministic across machines.
 */
const ReactCalendar = toReactComponent(BaseCalendar, 'Calendar');
const VueCalendar = toVueComponent(BaseCalendar, 'Calendar');

describe('BaseCalendar authors the same component for React and Vue', () => {
  it('renders the month label and weekday header for the selected value on both frameworks', async () => {
    const properties = { modelValue: '2026-06-18', timezone: 'UTC' };
    const react = renderToStaticMarkup(createElement(ReactCalendar, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCalendar, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('June 2026');
      expect(html).toContain('role="grid"');
      // Every weekday header is present.
      for (const weekday of ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) {
        expect(html).toContain(`>${weekday}</span>`);
      }
    }
  });

  it('marks the selected day as aria-selected on both frameworks', async () => {
    const properties = { modelValue: '2026-06-18', timezone: 'UTC' };
    const react = renderToStaticMarkup(createElement(ReactCalendar, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCalendar, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="2026-06-18"');
      expect(html).toContain('aria-selected="true"');
    }
  });

  it('disables the dates in disabledDates on both frameworks', async () => {
    const properties = { modelValue: '2026-06-18', disabledDates: ['2026-06-20'], timezone: 'UTC' };
    const react = renderToStaticMarkup(createElement(ReactCalendar, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCalendar, properties) }));

    for (const html of [react, vue]) {
      // The disabled day's button is rendered disabled.
      expect(html).toMatch(/aria-label="2026-06-20"[^>]*disabled|disabled[^>]*aria-label="2026-06-20"/);
    }
  });

  it('marks the range start and end caps as aria-selected on both frameworks', async () => {
    const properties = { rangeStart: '2026-06-12', rangeEnd: '2026-06-22', timezone: 'UTC' };
    const react = renderToStaticMarkup(createElement(ReactCalendar, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueCalendar, properties) }));

    for (const html of [react, vue]) {
      // Both caps of the range are rendered, and exactly two days expose
      // aria-selected="true" (the start and end caps; the in-between days do not).
      expect(html).toContain('aria-label="2026-06-12"');
      expect(html).toContain('aria-label="2026-06-22"');
      expect(html).toContain('aria-label="2026-06-15"');
      expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(2);
    }
  });
});
