import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseSwitch from './BaseSwitch.vue';

describe('BaseSwitch', () => {
  it('renders a checkbox input with role="switch"', () => {
    const wrapper = mount(BaseSwitch);
    const input = wrapper.find('input[type="checkbox"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('role')).toBe('switch');
  });

  it('is checked when modelValue is true', () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: true } });
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true);
  });

  it('is unchecked when modelValue is false', () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: false } });
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false);
  });

  it('emits update:modelValue with true when switched on', async () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: false } });
    await wrapper.find('input').setValue(true);
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true]);
  });

  it('emits update:modelValue with false when switched off', async () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: true } });
    await wrapper.find('input').setValue(false);
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('renders label when label prop is provided', () => {
    const wrapper = mount(BaseSwitch, { props: { label: 'Enable notifications' } });
    expect(wrapper.find('.base-switch__label').text()).toBe('Enable notifications');
  });

  it('does not render label when label prop is not provided', () => {
    const wrapper = mount(BaseSwitch);
    expect(wrapper.find('.base-switch__label').exists()).toBe(false);
  });

  it('applies default size class (md)', () => {
    const wrapper = mount(BaseSwitch);
    expect(wrapper.classes()).toContain('base-switch--md');
  });

  it('applies custom size class', () => {
    const wrapper = mount(BaseSwitch, { props: { size: 'lg' } });
    expect(wrapper.classes()).toContain('base-switch--lg');
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseSwitch, { props: { disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('base-switch--disabled');
  });

  it('renders error message and adds error class', () => {
    const wrapper = mount(BaseSwitch, { props: { error: 'This field is required' } });
    expect(wrapper.find('.base-switch__error').text()).toBe('This field is required');
    expect(wrapper.classes()).toContain('base-switch--error');
  });

  it('renders hint text', () => {
    const wrapper = mount(BaseSwitch, { props: { hint: 'Toggle to enable' } });
    expect(wrapper.find('.base-switch__hint').text()).toBe('Toggle to enable');
  });

  it('does not render hint when error is present', () => {
    const wrapper = mount(BaseSwitch, { props: { error: 'Error', hint: 'Hint' } });
    expect(wrapper.find('.base-switch__hint').exists()).toBe(false);
    expect(wrapper.find('.base-switch__error').exists()).toBe(true);
  });
});
