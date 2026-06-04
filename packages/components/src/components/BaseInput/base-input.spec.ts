import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseInput from './BaseInput.vue';

describe('BaseInput', () => {
  it('renders an <input> element', () => {
    const wrapper = mount(BaseInput);
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('applies default type text', () => {
    const wrapper = mount(BaseInput);
    expect(wrapper.find('input').attributes('type')).toBe('text');
  });

  it('applies custom type', () => {
    const wrapper = mount(BaseInput, { props: { type: 'email' } });
    expect(wrapper.find('input').attributes('type')).toBe('email');
  });

  it('applies default size class (md)', () => {
    const wrapper = mount(BaseInput);
    expect(wrapper.classes()).toContain('base-input--md');
  });

  it('applies size class', () => {
    const wrapper = mount(BaseInput, { props: { size: 'sm' } });
    expect(wrapper.classes()).toContain('base-input--sm');
  });

  it('renders label when label prop is provided', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Email', id: 'email' } });
    const label = wrapper.find('label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toContain('Email');
  });

  it('does not render label when label prop is not provided', () => {
    const wrapper = mount(BaseInput);
    expect(wrapper.find('label').exists()).toBe(false);
  });

  it('renders hint text', () => {
    const wrapper = mount(BaseInput, { props: { hint: 'Enter your email' } });
    expect(wrapper.find('.base-input__hint').text()).toBe('Enter your email');
  });

  it('renders error message and adds error class', () => {
    const wrapper = mount(BaseInput, { props: { error: 'Required' } });
    expect(wrapper.find('.base-input__error').text()).toBe('Required');
    expect(wrapper.classes()).toContain('base-input--error');
  });

  it('does not render hint when error is present', () => {
    const wrapper = mount(BaseInput, { props: { error: 'Bad', hint: 'Some hint' } });
    expect(wrapper.find('.base-input__hint').exists()).toBe(false);
    expect(wrapper.find('.base-input__error').exists()).toBe(true);
  });

  it('binds modelValue to input value', () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'hello' } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('hello');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseInput);
    const input = wrapper.find('input');
    await input.setValue('test');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['test']);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseInput, { props: { disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('base-input--disabled');
  });

  it('renders prefix and suffix slots', () => {
    const wrapper = mount(BaseInput, {
      slots: { prefix: '<span class="pfx">@</span>', suffix: '<span class="sfx">.com</span>' },
    });
    expect(wrapper.find('.pfx').exists()).toBe(true);
    expect(wrapper.find('.sfx').exists()).toBe(true);
  });

  it('shows required asterisk when required prop is true', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Name', required: true } });
    expect(wrapper.find('.base-input__required').exists()).toBe(true);
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Hidden Label', labelHidden: true } });
    expect(wrapper.find('label').exists()).toBe(true);
    expect(wrapper.find('.base-input__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Visible Label' } });
    expect(wrapper.find('.base-input__label--hidden').exists()).toBe(false);
  });
});
