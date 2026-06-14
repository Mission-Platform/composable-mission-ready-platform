import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseVerticalLayout from './base-vertical-layout.vue';

/** Overrides `window.innerWidth` so `useBreakpoints` resolves a known band. */
function setViewportWidth(width: number) {
  Object.defineProperty(globalThis.window, 'innerWidth', { value: width, configurable: true, writable: true });
}

const slots = {
  start: () => h('p', 'start'),
  default: () => h('p', 'content'),
  end: () => h('p', 'end'),
};

describe('BaseVerticalLayout', () => {
  it('renders the start/end columns inline (fixed open) above the breakpoint', () => {
    setViewportWidth(1280); // ≥ md (1024)
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md', startTitle: 'Start', endTitle: 'End' },
      slots,
      attachTo: document.body,
    });
    const asides = wrapper.findAll('aside.base-sidebar--inline');
    expect(asides).toHaveLength(2);
    // The grid allocates a track for each inline side column.
    const style = wrapper.find('.vertical-layout').attributes('style') ?? '';
    expect(style).toContain('grid-template-columns');
    wrapper.unmount();
  });

  it('derives the inline grid track widths from the sidebar size scale', () => {
    setViewportWidth(1280); // ≥ md
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md', startTitle: 'Start', endTitle: 'End', startSize: 'lg', endSize: 'sm' },
      slots,
      attachTo: document.body,
    });
    const style = wrapper.find('.vertical-layout').attributes('style') ?? '';
    // lg → 34.286rem, sm → 20rem (from SIDEBAR_SIZE_REM).
    expect(style).toContain('34.286rem');
    expect(style).toContain('20rem');
    // The size is forwarded to the backing sidebars as a size modifier class.
    expect(wrapper.find('aside.base-sidebar--lg').exists()).toBe(true);
    expect(wrapper.find('aside.base-sidebar--sm').exists()).toBe(true);
    wrapper.unmount();
  });

  it('collapses the side columns into closed drawers below the breakpoint', () => {
    setViewportWidth(500); // < md
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md', startOpen: false, endOpen: false },
      slots,
      attachTo: document.body,
    });
    // Closed overlay drawers render nothing; only the content column remains.
    expect(wrapper.find('aside.base-sidebar').exists()).toBe(false);
    expect(wrapper.text()).toContain('content');
    wrapper.unmount();
  });

  it('emits update:startOpen via the scoped toggle helper', async () => {
    setViewportWidth(500);
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md' },
      slots: {
        start: () => h('p', 'start'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        default: ({ toggleStart }: any) => h('button', { onClick: () => toggleStart() }, 'toggle'),
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:startOpen')?.[0]).toEqual([true]);
    wrapper.unmount();
  });

  it('forwards draggable to the inline side columns, rendering their resize handles', () => {
    setViewportWidth(1280); // ≥ md
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md', startTitle: 'Start', endTitle: 'End', startDraggable: 'lg', endDraggable: 24 },
      slots,
      attachTo: document.body,
    });
    // Each draggable inline column exposes a resize handle on its inner edge.
    expect(wrapper.find('.base-sidebar__resize-handle--left').exists()).toBe(true);
    expect(wrapper.find('.base-sidebar__resize-handle--right').exists()).toBe(true);
    wrapper.unmount();
  });

  it('omits a side column when its slot is not provided', () => {
    setViewportWidth(1280);
    const wrapper = mountWithI18n(BaseVerticalLayout, {
      props: { breakpoint: 'md', startTitle: 'Start' },
      slots: { start: () => h('p', 'start'), default: () => h('p', 'content') },
      attachTo: document.body,
    });
    // Only the start column is present → a single inline sidebar.
    expect(wrapper.findAll('aside.base-sidebar--inline')).toHaveLength(1);
    wrapper.unmount();
  });
});
