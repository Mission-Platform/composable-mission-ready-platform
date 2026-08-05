import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseStatusIcon } from './base-status-icon';

/**
 * Exercises the **neutral** `BaseStatusIcon` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the toned glyph per status and the labelled/decorative accessibility
 * modes.
 */
const ReactStatusIcon = toReactComponent(BaseStatusIcon, 'StatusIcon');
const VueStatusIcon = toVueComponent(BaseStatusIcon, 'StatusIcon');

describe('BaseStatusIcon authors the same component for React and Vue', () => {
  it('renders a labelled, toned success glyph on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactStatusIcon, { status: 'success', size: 'lg', label: 'Complete' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueStatusIcon, { status: 'success', size: 'lg', label: 'Complete' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-status-icon');
      expect(html).toContain('base-status-icon--success');
      expect(html).toContain('base-status-icon--lg');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Complete"');
      expect(html).toContain('base-icon-check');
    }
  });

  it('is decorative (aria-hidden) without a label on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactStatusIcon, { status: 'error' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStatusIcon, { status: 'error' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-status-icon--error');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('base-icon-error');
    }
  });
});
