import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseVirtualLogViewer, type LogEntry } from './base-virtual-log-viewer';

/**
 * Exercises the **neutral** `BaseVirtualLogViewer` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge` runtime
 * adapters. Covers the windowed rows (with the composed `BaseTypography`), the
 * level label, and the filter toolbar.
 */
const ReactLogViewer = toReactComponent(BaseVirtualLogViewer, 'VirtualLogViewer');
const VueLogViewer = toVueComponent(BaseVirtualLogViewer, 'VirtualLogViewer');

const ENTRIES: LogEntry[] = Array.from({ length: 60 }, (_, index) => ({
  id: index,
  level: index % 5 === 0 ? 'error' : 'info',
  message: `log line ${index}`,
  timestamp: `00:00:${String(index).padStart(2, '0')}`,
}));

describe('BaseVirtualLogViewer authors the same component for React and Vue', () => {
  it('renders the windowed rows with level labels on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactLogViewer, { entries: ENTRIES, itemHeight: 24, height: 120, followTail: false }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueLogViewer, { entries: ENTRIES, itemHeight: 24, height: 120, followTail: false }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('log line 0');
      expect(html).toContain('ERROR');
      // Far-off rows are virtualised away.
      expect(html).not.toContain('log line 59');
    }
  });

  it('shows the filter toolbar with the matching count on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactLogViewer, {
        entries: ENTRIES,
        itemHeight: 24,
        height: 120,
        filter: 'line 1',
        followTail: false,
      }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueLogViewer, { entries: ENTRIES, itemHeight: 24, height: 120, filter: 'line 1', followTail: false }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('matching');
    }
  });
});
