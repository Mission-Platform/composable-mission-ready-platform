import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDropdown } from './base-dropdown';

/**
 * Exercises the **neutral** `BaseDropdown` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * The panel is portalled through the neutral `<Teleport>` primitive (the
 * adapters render teleported children in place for SSR parity) and gated on
 * `open`, so it only ships in the markup while open; when open it stays anchored
 * to its trigger via the CSS Anchor Positioning API (`anchor-name` on the
 * trigger, `position-anchor` on the panel). The trigger and menu content must
 * match across React and Vue.
 */
const ReactDropdown = toReactComponent(BaseDropdown, 'Dropdown');
const VueDropdown = toVueComponent(BaseDropdown, 'Dropdown');

describe('BaseDropdown authors the same component for React and Vue', () => {
  it('teleports the trigger-anchored panel when open on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactDropdown,
        { open: true, trigger: createElement('button', undefined, 'Menu') },
        createElement('ul', undefined, createElement('li', undefined, 'Profile')),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueDropdown,
            { open: true },
            {
              trigger: () => vueH('button', undefined, 'Menu'),
              default: () => vueH('ul', undefined, vueH('li', undefined, 'Profile')),
            },
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button>Menu</button>');
      // The teleported panel ships in the markup while open, is focusable, and is
      // tethered to the trigger via CSS anchor positioning.
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('anchor-name:');
      expect(html).toContain('position-anchor:');
      expect(html).toContain('Profile');
    }
  });

  it('uses a valid (fully-logical) position-area for compound placements on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactDropdown,
        { open: true, placement: 'bottom-start', trigger: createElement('button', undefined, 'Menu') },
        createElement('ul', undefined, createElement('li', undefined, 'Profile')),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueDropdown,
            { open: true, placement: 'bottom-start' },
            {
              trigger: () => vueH('button', undefined, 'Menu'),
              default: () => vueH('ul', undefined, vueH('li', undefined, 'Profile')),
            },
          ),
      }),
    );

    for (const html of [react, vue]) {
      // `position-area` rejects values that mix a physical side keyword with a
      // logical span, so `bottom span-inline-end` is silently dropped and the
      // teleported panel falls back to its static position. The compound
      // (`-start`/`-end`) placements must use the valid fully-logical form.
      expect(html).toContain('position-area:block-end span-inline-end');
      expect(html).not.toContain('position-area:bottom span-inline-end');
    }
  });

  it('opts the teleported panel into the browser top layer via the Popover API on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactDropdown,
        { open: true, trigger: createElement('button', undefined, 'Menu') },
        createElement('ul', undefined, createElement('li', undefined, 'Profile')),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueDropdown,
            { open: true },
            {
              trigger: () => vueH('button', undefined, 'Menu'),
              default: () => vueH('ul', undefined, vueH('li', undefined, 'Profile')),
            },
          ),
      }),
    );

    for (const html of [react, vue]) {
      // `popover="manual"` promotes the panel into the browser top layer so it
      // renders above an open native `<dialog>` modal/dialog; the runtime calls
      // `showPopover()` while open, with the CSS `z-index` as the fallback.
      expect(html).toContain('popover="manual"');
    }
  });

  it('omits the teleported panel while closed on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactDropdown,
        { open: false, trigger: createElement('button', undefined, 'Menu') },
        createElement('ul', undefined, createElement('li', undefined, 'Profile')),
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueDropdown,
            { open: false },
            {
              trigger: () => vueH('button', undefined, 'Menu'),
              default: () => vueH('ul', undefined, vueH('li', undefined, 'Profile')),
            },
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<button>Menu</button>');
      expect(html).not.toContain('Profile');
    }
  });
});
