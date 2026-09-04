import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeStatusIcon } from './forge-status-icon';

/**
 * Exercises the **neutral** `ForgeStatusIcon` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the toned glyph per status and the labelled/decorative accessibility
 * modes.
 */
const ReactStatusIcon = toReactComponent(ForgeStatusIcon, 'StatusIcon');
const VueStatusIcon = toVueComponent(ForgeStatusIcon, 'StatusIcon');

describe('ForgeStatusIcon authors the same component for React and Vue', () => {
  it('renders a labelled, toned success glyph on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactStatusIcon, { status: 'success', size: 'lg', label: 'Complete' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueStatusIcon, { status: 'success', size: 'lg', label: 'Complete' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-status-icon');
      expect(html).toContain('forge-status-icon--success');
      expect(html).toContain('forge-status-icon--lg');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Complete"');
      expect(html).toContain('forge-icon-check');
    }
  });

  it('is decorative (aria-hidden) without a label on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactStatusIcon, { status: 'error' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueStatusIcon, { status: 'error' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-status-icon--error');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('forge-icon-error');
    }
  });
});
