import { describe, expect, it } from 'vitest';

import { createTestRouter, mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseDrawer from './base-drawer.vue';

/** Overrides `window.innerWidth` so `useBreakpoints` resolves a known band. */
function setViewportWidth(width: number) {
  Object.defineProperty(globalThis.window, 'innerWidth', { value: width, configurable: true, writable: true });
}

describe('BaseDrawer', () => {
  it('renders nothing when closed', () => {
    const wrapper = mountWithI18n(BaseDrawer, {
      props: { open: false, title: 'Test' },
      attachTo: document.body,
    });
    expect(wrapper.find('aside').exists()).toBe(false);
  });

  it('renders aside when open', () => {
    const wrapper = mountWithI18n(BaseDrawer, {
      props: { open: true, title: 'Test' },
      attachTo: document.body,
    });
    expect(document.querySelector('aside.base-drawer')).toBeTruthy();
    wrapper.unmount();
  });

  it('renders title in header', () => {
    const wrapper = mountWithI18n(BaseDrawer, {
      props: { open: true, title: 'My Drawer' },
      attachTo: document.body,
    });
    expect(document.querySelector('.base-drawer__title')?.textContent).toBe('My Drawer');
    wrapper.unmount();
  });

  it('defaults to the `start` placement', () => {
    const wrapper = mountWithI18n(BaseDrawer, {
      props: { open: true, title: 'Test' },
      attachTo: document.body,
    });
    expect(document.querySelector('.base-drawer--start')).toBeTruthy();
    wrapper.unmount();
  });

  it.each(['start', 'end', 'top', 'bottom'] as const)('applies the correct placement class for %s', (placement) => {
    const wrapper = mountWithI18n(BaseDrawer, {
      props: { open: true, title: 'Test', placement },
      attachTo: document.body,
    });
    expect(document.querySelector(`.base-drawer--${placement}`)).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close and update:open when route changes and closeOnRouteChange is true', async () => {
    const router = createTestRouter();
    const wrapper = mountWithI18n(
      BaseDrawer,
      { props: { open: true, title: 'Test', closeOnRouteChange: true }, attachTo: document.body },
      router,
    );
    await router.push('/test-route');
    expect(wrapper.emitted('close')).toBeTruthy();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('does not emit close when route changes and closeOnRouteChange is false', async () => {
    const router = createTestRouter();
    const wrapper = mountWithI18n(
      BaseDrawer,
      { props: { open: true, title: 'Test', closeOnRouteChange: false }, attachTo: document.body },
      router,
    );
    await router.push('/another-route');
    expect(wrapper.emitted('close')).toBeFalsy();
    wrapper.unmount();
  });

  describe('draggable / resize', () => {
    it('renders a resize handle on the inner edge when draggable and open', () => {
      setViewportWidth(1280); // ≥ sm
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: true, title: 'Resizable', draggable: 'lg', placement: 'start' },
        attachTo: document.body,
      });
      const handle = document.querySelector('.base-drawer__resize-handle');
      expect(handle).toBeTruthy();
      expect(handle?.classList.contains('base-drawer__resize-handle--start')).toBe(true);
      expect(document.querySelector('.base-drawer--draggable')).toBeTruthy();
      wrapper.unmount();
    });

    it('renders a resize handle for a top placement', () => {
      setViewportWidth(1280);
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: true, title: 'Resizable', draggable: 'lg', placement: 'top' },
        attachTo: document.body,
      });
      const handle = document.querySelector('.base-drawer__resize-handle');
      expect(handle?.classList.contains('base-drawer__resize-handle--top')).toBe(true);
      wrapper.unmount();
    });

    it('does not render a resize handle when not draggable', () => {
      setViewportWidth(1280);
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: true, title: 'Fixed' },
        attachTo: document.body,
      });
      expect(document.querySelector('.base-drawer__resize-handle')).toBeFalsy();
      wrapper.unmount();
    });

    it('does not render the handle below sm for a horizontal overlay (full-width mobile)', () => {
      setViewportWidth(500); // < sm (768)
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: true, title: 'Resizable', draggable: true },
        attachTo: document.body,
      });
      expect(document.querySelector('.base-drawer__resize-handle')).toBeFalsy();
      wrapper.unmount();
    });

    it('still renders the handle below sm for a vertical (top/bottom) overlay', () => {
      setViewportWidth(500); // < sm (768)
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: true, title: 'Resizable', draggable: true, placement: 'bottom' },
        attachTo: document.body,
      });
      expect(document.querySelector('.base-drawer__resize-handle--bottom')).toBeTruthy();
      wrapper.unmount();
    });
  });

  describe('inline variant', () => {
    it('renders a static, fixed-open inline panel above the breakpoint, even when closed', () => {
      setViewportWidth(1280); // ≥ md (1024)
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: false, variant: 'inline', inlineBreakpoint: 'md', title: 'Inline' },
        attachTo: document.body,
      });
      // Rendered in place (Teleport disabled), not in document.body directly.
      const aside = wrapper.find('aside.base-drawer');
      expect(aside.exists()).toBe(true);
      expect(aside.classes()).toContain('base-drawer--inline');
      // No backdrop and no close button in the fixed-open inline mode.
      expect(document.querySelector('.base-drawer-backdrop')).toBeFalsy();
      expect(wrapper.find('.base-drawer__close').exists()).toBe(false);
      wrapper.unmount();
    });

    it('falls back to overlay drawer behaviour below the breakpoint', () => {
      setViewportWidth(500); // < md (1024)
      const wrapper = mountWithI18n(BaseDrawer, {
        props: { open: false, variant: 'inline', inlineBreakpoint: 'md', title: 'Inline' },
        attachTo: document.body,
      });
      // Closed + below breakpoint → behaves like a closed overlay (nothing shown).
      expect(document.querySelector('aside.base-drawer')).toBeFalsy();
      wrapper.unmount();
    });

    it('does not auto-close on route change while inline (fixed open)', async () => {
      setViewportWidth(1280);
      const router = createTestRouter();
      const wrapper = mountWithI18n(
        BaseDrawer,
        { props: { open: true, variant: 'inline', inlineBreakpoint: 'md', title: 'Inline' }, attachTo: document.body },
        router,
      );
      await router.push('/inline-route');
      expect(wrapper.emitted('close')).toBeFalsy();
      wrapper.unmount();
    });
  });
});
