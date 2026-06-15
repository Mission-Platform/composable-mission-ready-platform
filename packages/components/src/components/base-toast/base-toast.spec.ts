import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseToast from './base-toast.vue';

describe('BaseToast', () => {
  it('renders the title and message', () => {
    const wrapper = mount(BaseToast, { props: { title: 'Saved', message: 'Your changes were saved.' } });
    expect(wrapper.find('.base-toast__title').text()).toBe('Saved');
    expect(wrapper.find('.base-toast__message').text()).toBe('Your changes were saved.');
  });

  it('renders the default slot in place of the message prop', () => {
    const wrapper = mount(BaseToast, { props: { message: 'ignored' }, slots: { default: 'Slotted body' } });
    expect(wrapper.find('.base-toast__message').text()).toBe('Slotted body');
  });

  it('applies the variant class', () => {
    for (const variant of ['info', 'success', 'warning', 'error', 'neutral'] as const) {
      const wrapper = mount(BaseToast, { props: { variant } });
      expect(wrapper.classes()).toContain(`base-toast--${variant}`);
    }
  });

  it('uses role="status" for info/success/neutral and role="alert" for warning/error', () => {
    expect(mount(BaseToast, { props: { variant: 'info' } }).attributes('role')).toBe('status');
    expect(mount(BaseToast, { props: { variant: 'success' } }).attributes('role')).toBe('status');
    expect(mount(BaseToast, { props: { variant: 'warning' } }).attributes('role')).toBe('alert');
    expect(mount(BaseToast, { props: { variant: 'error' } }).attributes('role')).toBe('alert');
  });

  it('renders a dismiss button by default and emits dismiss on click', async () => {
    const wrapper = mount(BaseToast, { props: { message: 'x' } });
    const button = wrapper.find('.base-toast__dismiss');
    expect(button.exists()).toBe(true);
    await button.trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it('hides the dismiss button when not dismissible', () => {
    const wrapper = mount(BaseToast, { props: { message: 'x', dismissible: false } });
    expect(wrapper.find('.base-toast__dismiss').exists()).toBe(false);
  });
});
