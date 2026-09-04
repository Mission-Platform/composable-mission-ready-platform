import { isMpElement, Slot, type MpElement } from '@mission-platform/forge-jsx';
import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDrawer } from './forge-drawer';

/**
 * Exercises the **neutral** `ForgeDrawer` on both frameworks through the
 * `@mission-platform/forge-jsx` runtime adapters. During SSR the reactive breakpoint
 * is `false`, so the overlay behaviour is exercised: an open drawer renders the
 * panel + backdrop, a closed one renders neither.
 */
const ReactDrawer = toReactComponent(ForgeDrawer, 'Drawer');
const VueDrawer = toVueComponent(ForgeDrawer, 'Drawer');

function findDefaultSlotOutlet(element: MpElement): MpElement | undefined {
  if (
    element.children.some((child) => isMpElement(child) && child.type === Slot && child.properties.name === undefined)
  ) {
    return element;
  }
  for (const child of element.children) {
    if (isMpElement(child)) {
      const outlet = findDefaultSlotOutlet(child);
      if (outlet) {
        return outlet;
      }
    }
  }
  return undefined;
}

describe('ForgeDrawer authors the same component for React and Vue', () => {
  it('renders the panel, header, body, and backdrop when open on both frameworks', async () => {
    const properties = { open: true, title: 'Settings', placement: 'end' as const, size: 'sm' as const };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties, 'Drawer body'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties, () => 'Drawer body') }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-drawer-backdrop');
      expect(html).toContain('forge-drawer');
      expect(html).toContain('forge-drawer--end');
      expect(html).toContain('forge-drawer--sm');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Settings');
      expect(html).toContain('Drawer body');
      // The close button carries the accessible label.
      expect(html).toContain('aria-label="Close"');
    }
  });

  it('projects the default body slot and preserves header/footer named slots on both frameworks', async () => {
    const properties = { open: true, header: 'Drawer header', footer: 'Footer actions' };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties, 'Drawer body'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueDrawer, properties, { default: () => 'Drawer body' }) }),
    );

    const body = findDefaultSlotOutlet(ForgeDrawer({ ...properties, children: 'Drawer body' }));
    expect(body).toBeDefined();
    expect(body?.children).toHaveLength(1);

    for (const html of [react, vue]) {
      expect(html).toContain('forge-drawer__header');
      expect(html).toContain('Drawer header');
      expect(html).toContain('forge-drawer__body');
      expect(html).toContain('Drawer body');
      expect(html).toContain('forge-drawer__footer');
      expect(html).toContain('Footer actions');
    }
  });

  it('renders nothing visible when closed on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactDrawer, { open: false, title: 'Hidden' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, { open: false, title: 'Hidden' }) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('forge-drawer-backdrop');
      expect(html).not.toContain('role="dialog"');
      expect(html).not.toContain('Hidden');
    }
  });

  it('renders the footer content when provided on both frameworks', async () => {
    const properties = { open: true, title: 'With footer', footer: 'Footer actions' };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-drawer__footer');
      expect(html).toContain('Footer actions');
    }
  });

  it('renders a resize handle when draggable on both frameworks', async () => {
    // A `top` overlay is resizable at every breakpoint (only horizontal overlays
    // need the `sm` breakpoint), so the handle renders during SSR.
    const properties = { open: true, title: 'Resizable', placement: 'top' as const, draggable: true };
    const react = renderToStaticMarkup(createElement(ReactDrawer, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDrawer, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-drawer--draggable');
      expect(html).toContain('forge-drawer__resize-handle');
      expect(html).toContain('role="separator"');
    }
  });
});
