import { describe, expect, it } from 'vitest';

import { createTestRouter, mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseDialog from './BaseDialog.vue';

describe('BaseDialog', () => {
  it('renders a dialog element', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' } });
    expect(wrapper.find('dialog').exists()).toBe(true);
  });

  it('renders title when provided', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'My Dialog' } });
    expect(wrapper.find('.base-dialog__title').text()).toBe('My Dialog');
  });

  it('renders body slot content', () => {
    const wrapper = mountWithI18n(BaseDialog, {
      props: { title: 'Test' },
      slots: { default: 'Body text' },
    });
    expect(wrapper.find('.base-dialog__body').text()).toContain('Body text');
  });

  it('renders footer slot when provided', () => {
    const wrapper = mountWithI18n(BaseDialog, {
      props: { title: 'Test' },
      slots: { footer: '<button>OK</button>' },
    });
    expect(wrapper.find('.base-dialog__footer').exists()).toBe(true);
  });

  it('does not render footer when slot is absent', () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' } });
    expect(wrapper.find('.base-dialog__footer').exists()).toBe(false);
  });

  it('emits update:open false when close button is clicked', async () => {
    const wrapper = mountWithI18n(BaseDialog, { props: { title: 'Test' } });
    await wrapper.find('.base-dialog__close').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('emits close when route changes and closeOnRouteChange is true', async () => {
    const router = createTestRouter();
    const wrapper = mountWithI18n(
      BaseDialog,
      { props: { open: true, title: 'Test', closeOnRouteChange: true } },
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
      { props: { open: true, title: 'Test', closeOnRouteChange: false } },
      router,
    );
    await router.push('/another-route');
    expect(wrapper.emitted('close')).toBeFalsy();
    wrapper.unmount();
  });
});
