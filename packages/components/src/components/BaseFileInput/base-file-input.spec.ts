import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseFileInput from './BaseFileInput.vue';

describe('BaseFileInput', () => {
  it('renders a hidden native file input', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: {} });
    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
    expect(input.classes()).toContain('base-file-input__native');
  });

  it('renders label when provided', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { label: 'Upload' } });
    expect(wrapper.find('.base-file-input__label').text()).toContain('Upload');
  });

  it('renders error message', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { error: 'Required' } });
    expect(wrapper.find('.base-file-input__error').text()).toBe('Required');
  });

  it('renders hint message', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { hint: 'PDF only' } });
    expect(wrapper.find('.base-file-input__hint').text()).toBe('PDF only');
  });

  it('renders dropzone when dragDrop is true', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { dragDrop: true } });
    expect(wrapper.find('.base-file-input__dropzone').exists()).toBe(true);
  });

  it('renders button row when dragDrop is false', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { dragDrop: false } });
    expect(wrapper.find('.base-file-input__row').exists()).toBe(true);
  });

  it('applies disabled class', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { disabled: true } });
    expect(wrapper.find('.base-file-input').classes()).toContain('base-file-input--disabled');
  });

  it('applies error class', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { error: 'Oops' } });
    expect(wrapper.find('.base-file-input').classes()).toContain('base-file-input--error');
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mountWithI18n(BaseFileInput, {
      props: { label: 'Hidden Label', labelHidden: true },
    });
    expect(wrapper.find('label.base-file-input__label').exists()).toBe(true);
    expect(wrapper.find('.base-file-input__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mountWithI18n(BaseFileInput, { props: { label: 'Visible Label' } });
    expect(wrapper.find('.base-file-input__label--hidden').exists()).toBe(false);
  });
});
