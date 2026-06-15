import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseAlertBanner from './base-alert-banner.vue';

describe('BaseAlertBanner', () => {
  it('renders the message slot and title', () => {
    const wrapper = mount(BaseAlertBanner, {
      props: { title: 'Heads up' },
      slots: { default: 'Something happened' },
    });
    expect(wrapper.find('.base-alert-banner__title').text()).toBe('Heads up');
    expect(wrapper.find('.base-alert-banner__message').text()).toBe('Something happened');
  });

  it('is visible by default and applies the default (info) variant', () => {
    const wrapper = mount(BaseAlertBanner);
    expect(wrapper.find('.base-alert-banner').exists()).toBe(true);
    expect(wrapper.classes()).toContain('base-alert-banner--info');
  });

  it('is hidden when modelValue is false', () => {
    const wrapper = mount(BaseAlertBanner, { props: { modelValue: false } });
    expect(wrapper.find('.base-alert-banner').exists()).toBe(false);
  });

  it('uses role="status" for info/success/neutral and role="alert" for warning/error', () => {
    expect(mount(BaseAlertBanner, { props: { variant: 'info' } }).attributes('role')).toBe('status');
    expect(mount(BaseAlertBanner, { props: { variant: 'success' } }).attributes('role')).toBe('status');
    expect(mount(BaseAlertBanner, { props: { variant: 'neutral' } }).attributes('role')).toBe('status');
    expect(mount(BaseAlertBanner, { props: { variant: 'warning' } }).attributes('role')).toBe('alert');
    expect(mount(BaseAlertBanner, { props: { variant: 'error' } }).attributes('role')).toBe('alert');
  });

  it('renders the status icon by default and hides it when icon is false', () => {
    expect(mount(BaseAlertBanner).find('.base-alert-banner__icon').exists()).toBe(true);
    expect(mount(BaseAlertBanner, { props: { icon: false } }).find('.base-alert-banner__icon').exists()).toBe(false);
  });

  it('does not render the dismiss button unless dismissible', () => {
    expect(mount(BaseAlertBanner).find('.base-alert-banner__dismiss').exists()).toBe(false);
  });

  it('emits update:modelValue and dismiss when the dismiss button is clicked', async () => {
    const wrapper = mount(BaseAlertBanner, { props: { dismissible: true } });
    await wrapper.find('.base-alert-banner__dismiss').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it('renders the actions slot', () => {
    const wrapper = mount(BaseAlertBanner, { slots: { actions: '<button>Retry</button>' } });
    expect(wrapper.find('.base-alert-banner__actions button').exists()).toBe(true);
  });
});
