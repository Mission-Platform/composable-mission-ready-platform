import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseOtpInput from './base-otp-input.vue';

describe('BaseOtpInput', () => {
  it('renders `length` cells (default 6)', () => {
    const wrapper = mountWithI18n(BaseOtpInput);
    expect(wrapper.findAll('.base-otp-input__cell')).toHaveLength(6);
  });

  it('renders a custom number of cells', () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4 } });
    expect(wrapper.findAll('.base-otp-input__cell')).toHaveLength(4);
  });

  it('distributes the model value across the cells', () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, modelValue: '12' } });
    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe('1');
    expect((inputs[1].element as HTMLInputElement).value).toBe('2');
    expect((inputs[2].element as HTMLInputElement).value).toBe('');
  });

  it('updates the model and advances on input', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, modelValue: '' } });
    const inputs = wrapper.findAll('input');
    inputs[0].element.value = '7';
    await inputs[0].trigger('input');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['7']);
  });

  it('ignores non-numeric input in numeric mode', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, type: 'numeric' } });
    const input = wrapper.find('input');
    input.element.value = 'a';
    await input.trigger('input');
    // 'a' is stripped → value stays empty, no model emission with a letter.
    const emitted = wrapper.emitted('update:modelValue') ?? [];
    expect(emitted.every(([value]) => value === '')).toBe(true);
  });

  it('accepts letters in alphanumeric mode', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, type: 'alphanumeric' } });
    const input = wrapper.find('input');
    input.element.value = 'A';
    await input.trigger('input');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['A']);
  });

  it('emits complete when every cell is filled', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, modelValue: '123' } });
    const inputs = wrapper.findAll('input');
    inputs[3].element.value = '4';
    await inputs[3].trigger('input');
    expect(wrapper.emitted('complete')?.at(-1)).toEqual(['1234']);
  });

  it('distributes a pasted code across the cells', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 6, modelValue: '' } });
    const input = wrapper.find('input');
    const clipboardData = { getData: () => '123456' } as unknown as DataTransfer;
    await input.trigger('paste', { clipboardData });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['123456']);
    expect(wrapper.emitted('complete')?.at(-1)).toEqual(['123456']);
  });

  it('clears the previous cell on backspace when empty', async () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { length: 4, modelValue: '12' }, attachTo: document.body });
    const inputs = wrapper.findAll('input');
    await inputs[2].trigger('keydown', { key: 'Backspace' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['1']);
    wrapper.unmount();
  });

  it('renders masked password cells when mask is set', () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { mask: true } });
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('disables every cell when disabled', () => {
    const wrapper = mountWithI18n(BaseOtpInput, { props: { disabled: true } });
    expect(wrapper.findAll('input').every((input) => input.attributes('disabled') !== undefined)).toBe(true);
  });
});
