import { describe, expect, it } from 'vitest';

import { createTestRouter, mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseDialog from './base-dialog.vue';

describe('BaseDialog', () => {
  it('renders a dialog element', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' }, attachTo: document.body });
    expect(document.querySelector('dialog')).not.toBeNull();
    wrapper.unmount();
  });

  it('renders title when provided', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'My Dialog' }, attachTo: document.body });
    expect(document.querySelector('.base-dialog__title')?.textContent).toBe('My Dialog');
    wrapper.unmount();
  });

  it('renders body slot content', () => {
    const wrapper = mountWithI18n(BaseDialog, {
      props: { title: 'Test' },
      slots: { default: 'Body text' },
      attachTo: document.body,
    });
    expect(document.querySelector('.base-dialog__body')?.textContent).toContain('Body text');
    wrapper.unmount();
  });

  it('renders footer slot when provided', () => {
    const wrapper = mountWithI18n(BaseDialog, {
      props: { title: 'Test' },
      slots: { footer: '<button>OK</button>' },
      attachTo: document.body,
    });
    expect(document.querySelector('.base-dialog__footer')).not.toBeNull();
    wrapper.unmount();
  });

  it('does not render footer when slot is absent', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' }, attachTo: document.body });
    expect(document.querySelector('.base-dialog__footer')).toBeNull();
    wrapper.unmount();
  });

  it('emits update:open false when close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' }, attachTo: document.body });
    const closeButton = document.querySelector('.base-dialog__close') as HTMLButtonElement;
    closeButton.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('emits close when route changes and closeOnRouteChange is true', async () => {
    const router = createTestRouter();
    const wrapper = mountWithI18n(
      BaseDialog,
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
      BaseDialog,
      { props: { open: true, title: 'Test', closeOnRouteChange: false }, attachTo: document.body },
      router,
    );
    await router.push('/another-route');
    expect(wrapper.emitted('close')).toBeFalsy();
    wrapper.unmount();
  });
});
