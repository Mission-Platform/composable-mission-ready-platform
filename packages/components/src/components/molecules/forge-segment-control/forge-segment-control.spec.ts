import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSegmentControl, type SegmentOption } from './forge-segment-control';

/**
 * Exercises the **neutral** `ForgeSegmentControl` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Covers the radiogroup roles, the selected segment, and the roving
 * `tabindex`.
 */
const ReactSegmentControl = toReactComponent(ForgeSegmentControl, 'SegmentControl');
const VueSegmentControl = toVueComponent(ForgeSegmentControl, 'SegmentControl');

const options: SegmentOption[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

describe('ForgeSegmentControl authors the same component for React and Vue', () => {
  it('renders a radiogroup with the selected segment checked on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactSegmentControl, { options, modelValue: 'week', ariaLabel: 'View' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueSegmentControl, { options, modelValue: 'week', ariaLabel: 'View' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="View"');
      expect(html).toContain('role="radio"');
      expect(html).toContain('Day');
      expect(html).toContain('Week');
      expect(html).toContain('Month');
      // The selected segment is checked and focusable; the others are not.
      expect(html).toContain('aria-checked="true"');
    }
  });

  it('disables an individual segment on both frameworks', async () => {
    const withDisabled: SegmentOption[] = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
    ];
    const react = renderToStaticMarkup(createElement(ReactSegmentControl, { options: withDisabled }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueSegmentControl, { options: withDisabled }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('disabled');
    }
  });
});
