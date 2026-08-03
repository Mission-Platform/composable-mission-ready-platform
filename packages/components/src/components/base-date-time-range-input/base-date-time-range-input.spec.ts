import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDateTimeRangeInput } from './base-date-time-range-input';

/**
 * Exercises the **neutral** `BaseDateTimeRangeInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` adapters.
 * The calendar + time popover opens on the client, so the SSR markup is the
 * trigger shell with the `start → end (tz)` summary and the error wiring.
 */
const ReactDateTimeRangeInput = toReactComponent(BaseDateTimeRangeInput, 'DateTimeRangeInput');
const VueDateTimeRangeInput = toVueComponent(BaseDateTimeRangeInput, 'DateTimeRangeInput');

describe('BaseDateTimeRangeInput authors the same component for React and Vue', () => {
  it('renders the trigger with the range summary on both frameworks', async () => {
    const properties = {
      modelValue: { start: '2026-01-10 09:00', end: '2026-01-12 17:30', timezone: 'utc' as const },
      label: 'Window',
      id: 'dtr-1',
    };
    const react = renderToStaticMarkup(createElement(ReactDateTimeRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateTimeRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Window');
      expect(html).toContain('2026-01-10 09:00');
      expect(html).toContain('2026-01-12 17:30');
      expect(html).toContain('(UTC)');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('id="dtr-1"');
    }
  });

  it('wires the error message via aria-describedby on both frameworks', async () => {
    const properties = {
      modelValue: { start: '', end: '', timezone: 'browser' as const },
      label: 'Window',
      error: 'Pick a window',
      id: 'dtr-2',
    };
    const react = renderToStaticMarkup(createElement(ReactDateTimeRangeInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDateTimeRangeInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pick a window');
      expect(html).toContain('aria-describedby="dtr-2-error"');
      expect(html).toContain('aria-invalid="true"');
    }
  });
});
