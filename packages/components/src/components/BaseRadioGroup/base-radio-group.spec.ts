import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseRadioGroup from './BaseRadioGroup.vue';

const OPTIONS = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c', disabled: true },
];

describe('BaseRadioGroup', () => {
  it('renders a <fieldset> element', () => {
    const wrapper = mount(BaseRadioGroup);
    expect(wrapper.element.tagName).toBe('FIELDSET');
  });

  it('renders one radio per option', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS } });
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3);
  });

  it('renders legend when legend prop is provided', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, legend: 'Choose one' } });
    expect(wrapper.find('legend').text()).toContain('Choose one');
  });

  it('does not render legend when legend prop is not provided', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS } });
    expect(wrapper.find('legend').exists()).toBe(false);
  });

  it('checks the radio matching modelValue', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, modelValue: 'b' } });
    const inputs = wrapper.findAll('input[type="radio"]');
    expect((inputs[0].element as HTMLInputElement).checked).toBe(false);
    expect((inputs[1].element as HTMLInputElement).checked).toBe(true);
  });

  it('emits update:modelValue when a radio is changed', async () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, modelValue: 'a' } });
    await wrapper.findAll('input[type="radio"]')[1].trigger('change');
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['b']);
  });

  it('renders error message and adds error class', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, error: 'Select one' } });
    expect(wrapper.find('.base-radio-group__error').text()).toBe('Select one');
    expect(wrapper.classes()).toContain('base-radio-group--error');
  });

  it('renders hint text', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, hint: 'Pick carefully' } });
    expect(wrapper.find('.base-radio-group__hint').text()).toBe('Pick carefully');
  });

  it('applies vertical direction class by default', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS } });
    expect(wrapper.find('.base-radio-group__options').classes()).toContain('base-radio-group__options--vertical');
  });

  it('applies horizontal direction class', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, direction: 'horizontal' } });
    expect(wrapper.find('.base-radio-group__options').classes()).toContain('base-radio-group__options--horizontal');
  });

  it('disables all radios when disabled prop is true', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, disabled: true } });
    const inputs = wrapper.findAll('input[type="radio"]');
    for (const input of inputs) {
      expect(input.attributes('disabled')).toBeDefined();
    }
    expect(wrapper.classes()).toContain('base-radio-group--disabled');
  });

  it('disables individual options', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS } });
    const inputs = wrapper.findAll('input[type="radio"]');
    expect(inputs[2].attributes('disabled')).toBeDefined();
  });

  it('shows required asterisk in legend when required prop is true', () => {
    const wrapper = mount(BaseRadioGroup, {
      props: { options: OPTIONS, legend: 'Pick', required: true },
    });
    expect(wrapper.find('.base-radio-group__required').exists()).toBe(true);
  });

  it('renders legend visually hidden when legendHidden is true', () => {
    const wrapper = mount(BaseRadioGroup, {
      props: { options: OPTIONS, legend: 'Hidden Legend', legendHidden: true },
    });
    expect(wrapper.find('legend').exists()).toBe(true);
    expect(wrapper.find('.base-radio-group__legend--hidden').exists()).toBe(true);
  });

  it('renders legend visible by default when legendHidden is false', () => {
    const wrapper = mount(BaseRadioGroup, { props: { options: OPTIONS, legend: 'Visible Legend' } });
    expect(wrapper.find('.base-radio-group__legend--hidden').exists()).toBe(false);
  });
});
