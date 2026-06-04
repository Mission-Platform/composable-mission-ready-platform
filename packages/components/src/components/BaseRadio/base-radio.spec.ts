import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseRadio from './BaseRadio.vue';

describe('BaseRadio', () => {
  it('renders a radio input', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a' } });
    expect(wrapper.find('input[type="radio"]').exists()).toBe(true);
  });

  it('renders label text', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', label: 'Option A' } });
    expect(wrapper.text()).toContain('Option A');
  });

  it('is checked when modelValue equals value', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', modelValue: 'a' } });
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true);
  });

  it('is unchecked when modelValue differs from value', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', modelValue: 'b' } });
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false);
  });

  it('adds checked class when selected', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', modelValue: 'a' } });
    expect(wrapper.classes()).toContain('base-radio--checked');
  });

  it('emits update:modelValue with value when changed', async () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', modelValue: 'b' } });
    await wrapper.find('input').trigger('change');
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['a']);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('base-radio--disabled');
  });

  it('renders slot content', () => {
    const wrapper = mount(BaseRadio, {
      props: { value: 'a' },
      slots: { default: '<span class="custom">Custom</span>' },
    });
    expect(wrapper.find('.custom').exists()).toBe(true);
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseRadio, {
      props: { value: 'a', label: 'Hidden Label', labelHidden: true },
    });
    expect(wrapper.find('.base-radio__label').exists()).toBe(true);
    expect(wrapper.find('.base-radio__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseRadio, { props: { value: 'a', label: 'Visible Label' } });
    expect(wrapper.find('.base-radio__label--hidden').exists()).toBe(false);
  });
});
