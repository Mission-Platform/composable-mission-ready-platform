import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseSearchInput from './base-search-input.vue';

describe('BaseSearchInput', () => {
  it('renders a search input', () => {
    const wrapper = mountWithI18n(BaseSearchInput);
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it('shows clear button when modelValue is non-empty', () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { modelValue: 'hello' } });
    expect(wrapper.find('.base-search-input__clear').exists()).toBe(true);
  });

  it('does not show clear button when modelValue is empty', () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { modelValue: '' } });
    expect(wrapper.find('.base-search-input__clear').exists()).toBe(false);
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { modelValue: '' } });
    const input = wrapper.find('input');
    await input.setValue('test query');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test query']);
  });

  it('emits clear and update:modelValue empty string when clear button clicked', async () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { modelValue: 'hello' } });
    await wrapper.find('.base-search-input__clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toBeTruthy();
  });

  it('shows spinner when loading', () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { loading: true } });
    expect(wrapper.find('.base-search-input__spinner').exists()).toBe(true);
  });

  it('applies disabled class', () => {
    const wrapper = mountWithI18n(BaseSearchInput, { props: { disabled: true } });
    expect(wrapper.find('.base-search-input').classes()).toContain('base-search-input--disabled');
  });
});
