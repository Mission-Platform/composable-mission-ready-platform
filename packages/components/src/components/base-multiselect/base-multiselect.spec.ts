import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseMultiselect from './base-multiselect.vue';

const FRUIT_OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian', value: 'durian', disabled: true },
];

describe('BaseMultiselect', () => {
  it('renders a <div> root element', () => {
    const wrapper = mount(BaseMultiselect);
    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.classes()).toContain('base-multiselect');
  });

  it('applies default size class (md)', () => {
    const wrapper = mount(BaseMultiselect);
    expect(wrapper.classes()).toContain('base-multiselect--md');
  });

  it('applies size class', () => {
    for (const size of ['sm', 'lg'] as const) {
      const wrapper = mount(BaseMultiselect, { props: { size } });
      expect(wrapper.classes()).toContain(`base-multiselect--${size}`);
    }
  });

  it('renders a label when label prop is provided', () => {
    const wrapper = mount(BaseMultiselect, { props: { label: 'Fruits' } });
    const label = wrapper.find('label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toContain('Fruits');
  });

  it('does not render a label when label prop is absent', () => {
    const wrapper = mount(BaseMultiselect);
    expect(wrapper.find('label').exists()).toBe(false);
  });

  it('renders required asterisk when required', () => {
    const wrapper = mount(BaseMultiselect, { props: { label: 'Fruits', required: true } });
    expect(wrapper.find('.base-multiselect__required').exists()).toBe(true);
  });

  it('renders selected options as BaseTag components', () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: ['apple', 'banana'] },
    });
    const tags = wrapper.findAll('.base-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toContain('Apple');
    expect(tags[1].text()).toContain('Banana');
  });

  it('does not render tags when nothing is selected', () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: [] },
    });
    expect(wrapper.findAll('.base-tag')).toHaveLength(0);
  });

  it('opens the dropdown on input focus', async () => {
    const wrapper = mount(BaseMultiselect, { props: { options: FRUIT_OPTIONS } });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    expect(wrapper.classes()).toContain('base-multiselect--open');
  });

  it('shows only unselected options in the dropdown', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: ['apple'] },
    });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    const options = wrapper.findAll('.base-multiselect__option');
    const labels = options.map((o) => o.text());
    expect(labels).not.toContain('Apple');
    expect(labels).toContain('Banana');
    expect(labels).toContain('Cherry');
  });

  it('emits update:modelValue when an option is selected', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: [] },
    });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    await wrapper.find('.base-multiselect__option').trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0][0]).toContain('apple');
  });

  it('emits change when an option is selected', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: [] },
    });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    await wrapper.find('.base-multiselect__option').trigger('mousedown');
    expect(wrapper.emitted('change')).toBeTruthy();
  });

  it('emits update:modelValue with value removed when a tag remove button is clicked', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: ['apple', 'banana'] },
    });
    const removeButton = wrapper.find('.base-tag__remove');
    await removeButton.trigger('click');
    const emitted = wrapper.emitted('update:modelValue')!;
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).not.toContain('apple');
    expect(emitted[0][0]).toContain('banana');
  });

  it('removes the last tag on Backspace when search is empty', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: ['apple', 'banana'] },
    });
    const input = wrapper.find('.base-multiselect__input');
    await input.trigger('focus');
    await input.trigger('keydown', { key: 'Backspace' });
    const emitted = wrapper.emitted('update:modelValue')!;
    expect(emitted[0][0]).toEqual(['apple']);
  });

  it('closes the dropdown on Escape', async () => {
    const wrapper = mount(BaseMultiselect, { props: { options: FRUIT_OPTIONS } });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    expect(wrapper.classes()).toContain('base-multiselect--open');
    await wrapper.find('.base-multiselect__input').trigger('keydown', { key: 'Escape' });
    expect(wrapper.classes()).not.toContain('base-multiselect--open');
  });

  it('shows an error message when error prop is set', () => {
    const wrapper = mount(BaseMultiselect, { props: { error: 'Required field' } });
    const error = wrapper.find('.base-multiselect__error');
    expect(error.exists()).toBe(true);
    expect(error.text()).toBe('Required field');
    expect(error.attributes('role')).toBe('alert');
  });

  it('shows a hint message when hint prop is set', () => {
    const wrapper = mount(BaseMultiselect, { props: { hint: 'Select all that apply' } });
    const hint = wrapper.find('.base-multiselect__hint');
    expect(hint.exists()).toBe(true);
    expect(hint.text()).toBe('Select all that apply');
  });

  it('adds error class when error prop is set', () => {
    const wrapper = mount(BaseMultiselect, { props: { error: 'Required' } });
    expect(wrapper.classes()).toContain('base-multiselect--error');
  });

  it('adds disabled class when disabled prop is set', () => {
    const wrapper = mount(BaseMultiselect, { props: { disabled: true } });
    expect(wrapper.classes()).toContain('base-multiselect--disabled');
  });

  it('shows empty state message when no options match search', async () => {
    const wrapper = mount(BaseMultiselect, { props: { options: FRUIT_OPTIONS, modelValue: [] } });
    const input = wrapper.find('.base-multiselect__input');
    await input.trigger('focus');
    await input.setValue('zzz');
    expect(wrapper.find('.base-multiselect__empty').exists()).toBe(true);
  });

  it('does not select a disabled option', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: [] },
    });
    await wrapper.find('.base-multiselect__input').trigger('focus');
    const disabledOption = wrapper.find('.base-multiselect__option--disabled');
    await disabledOption.trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('does not set aria-controls on the input element', () => {
    const wrapper = mount(BaseMultiselect);
    expect(wrapper.find('.base-multiselect__input').attributes('aria-controls')).toBeUndefined();
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseMultiselect, { props: { label: 'Hidden Label', labelHidden: true } });
    expect(wrapper.find('label').exists()).toBe(true);
    expect(wrapper.find('.base-multiselect__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseMultiselect, { props: { label: 'Visible Label' } });
    expect(wrapper.find('.base-multiselect__label--hidden').exists()).toBe(false);
  });

  it('renders a hidden native multiple select backing the combobox', () => {
    const wrapper = mount(BaseMultiselect, { props: { options: FRUIT_OPTIONS } });
    const native = wrapper.find('select.base-multiselect__native');
    expect(native.exists()).toBe(true);
    expect(native.attributes('multiple')).toBeDefined();
    expect(native.findAll('option')).toHaveLength(FRUIT_OPTIONS.length);
    expect(native.attributes('aria-hidden')).toBe('true');
    expect(native.attributes('tabindex')).toBe('-1');
  });

  it('forwards name and autocomplete to the native select', () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, name: 'fruits', autocomplete: 'off' },
    });
    const native = wrapper.find('select.base-multiselect__native');
    expect(native.attributes('name')).toBe('fruits');
    expect(native.attributes('autocomplete')).toBe('off');
  });

  it('marks native options matching modelValue as selected', () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: ['apple', 'cherry'] },
    });
    const selected = wrapper
      .findAll('select.base-multiselect__native option')
      .filter((o) => (o.element as HTMLOptionElement).selected)
      .map((o) => o.text());
    expect(selected).toEqual(['Apple', 'Cherry']);
  });

  it('emits update:modelValue when the native select changes (autofill)', async () => {
    const wrapper = mount(BaseMultiselect, {
      props: { options: FRUIT_OPTIONS, modelValue: [] },
    });
    const native = wrapper.find('select.base-multiselect__native');
    await native.setValue(['apple', 'cherry']);
    const emitted = wrapper.emitted('update:modelValue')!;
    expect(emitted.at(-1)![0]).toEqual(['apple', 'cherry']);
    expect(wrapper.emitted('change')).toBeTruthy();
  });

  it('disables the native select when disabled', () => {
    const wrapper = mount(BaseMultiselect, { props: { options: FRUIT_OPTIONS, disabled: true } });
    expect(wrapper.find('select.base-multiselect__native').attributes('disabled')).toBeDefined();
  });
});
