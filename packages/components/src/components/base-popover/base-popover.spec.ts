import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BasePopover } from './base-popover';

/**
 * Exercises the **neutral** `BasePopover` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters. The
 * dialog panel is portalled through the neutral `<Teleport>` primitive (the
 * adapters render teleported children in place for SSR parity) and gated on
 * `open`, so it only ships in the markup while open; when open it stays anchored
 * to its trigger via the CSS Anchor Positioning API (`anchor-name` on the
 * trigger, `position-anchor` on the panel). The `role="dialog"` panel, label,
 * trigger, and default content must match across React and Vue.
 */
const ReactPopover = toReactComponent(BasePopover, 'Popover');
const VuePopover = toVueComponent(BasePopover, 'Popover');

describe('BasePopover authors the same component for React and Vue', () => {
  it('teleports the trigger-anchored dialog panel when open on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactPopover,
        { open: true, label: 'Account menu', trigger: createElement('button', undefined, 'Open') },
        createElement('p', undefined, 'Body content'),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VuePopover,
            { open: true, label: 'Account menu' },
            { trigger: () => vueH('button', undefined, 'Open'), default: () => vueH('p', undefined, 'Body content') },
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button>Open</button>');
      expect(html).toContain('role="dialog"');
      // The teleported dialog ships in the markup while open and is tethered to
      // the trigger via CSS anchor positioning.
      expect(html).toContain('anchor-name:');
      expect(html).toContain('position-anchor:');
      expect(html).toContain('aria-label="Account menu"');
      expect(html).toContain('Body content');
    }
  });

  it('uses a valid (fully-logical) position-area for compound placements on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactPopover,
        { open: true, placement: 'bottom-start', trigger: createElement('button', undefined, 'Open') },
        createElement('p', undefined, 'Body content'),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VuePopover,
            { open: true, placement: 'bottom-start' },
            { trigger: () => vueH('button', undefined, 'Open'), default: () => vueH('p', undefined, 'Body content') },
          ),
      }),
    );

    for (const html of [react, vue]) {
      // `position-area` rejects values that mix a physical side keyword with a
      // logical span, so `bottom span-inline-end` is silently dropped and the
      // teleported panel falls back to its static position (regression: only the
      // simple-keyword dropdown stayed anchored). The compound placements must
      // use the valid fully-logical form instead.
      expect(html).toContain('position-area:block-end span-inline-end');
      expect(html).not.toContain('position-area:bottom span-inline-end');
    }
  });

  it('omits the teleported dialog panel while closed on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactPopover,
        { open: false, label: 'Account menu', trigger: createElement('button', undefined, 'Open') },
        createElement('p', undefined, 'Body content'),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VuePopover,
            { open: false, label: 'Account menu' },
            { trigger: () => vueH('button', undefined, 'Open'), default: () => vueH('p', undefined, 'Body content') },
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button>Open</button>');
      expect(html).not.toContain('role="dialog"');
      expect(html).not.toContain('Body content');
    }
  });
});
