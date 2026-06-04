import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseSelect from './base-select.vue';

const OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
];

describe('BaseSelect', () => {
  it('renders a combobox element', () => {
    const wrapper = mount(BaseSelect);
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
  });

  it('applies default size class (md)', () => {
    const wrapper = mount(BaseSelect);
    expect(wrapper.classes()).toContain('base-select--md');
  });

  it('applies custom size class', () => {
    const wrapper = mount(BaseSelect, { props: { size: 'lg' } });
    expect(wrapper.classes()).toContain('base-select--lg');
  });

  it('renders options from options prop when open', async () => {
    const wrapper = mount(BaseSelect, { props: { options: OPTIONS } });
    await wrapper.find('button').trigger('click');
    const options = wrapper.findAll('[role="option"]').filter((o) => !o.classes('base-select__empty'));
    expect(options).toHaveLength(3);
    expect(options[0].text()).toBe('Apple');
    expect(options[1].text()).toBe('Banana');
  });

  it('renders placeholder text in trigger when placeholder prop is set', () => {
    const wrapper = mount(BaseSelect, { props: { options: OPTIONS, placeholder: 'Select...' } });
    expect(wrapper.find('button.base-select__field').text()).toBe('Select...');
  });

  it('renders label when label prop is provided', () => {
    const wrapper = mount(BaseSelect, { props: { label: 'Fruit', id: 'fruit' } });
    expect(wrapper.find('label').text()).toContain('Fruit');
  });

  it('renders error and adds error class', () => {
    const wrapper = mount(BaseSelect, { props: { error: 'Select a value' } });
    expect(wrapper.find('.base-select__error').text()).toBe('Select a value');
    expect(wrapper.classes()).toContain('base-select--error');
  });

  it('renders hint text', () => {
    const wrapper = mount(BaseSelect, { props: { hint: 'Pick one' } });
    expect(wrapper.find('.base-select__hint').text()).toBe('Pick one');
  });

  it('does not render hint when error is present', () => {
    const wrapper = mount(BaseSelect, { props: { error: 'Bad', hint: 'Hint' } });
    expect(wrapper.find('.base-select__hint').exists()).toBe(false);
  });

  it('emits update:modelValue when option is selected', async () => {
    const wrapper = mount(BaseSelect, { props: { options: OPTIONS, modelValue: '' } });
    await wrapper.find('button').trigger('click');
    const option = wrapper.findAll('[role="option"]').find((o) => o.text() === 'Banana')!;
    await option.trigger('mousedown');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['banana']);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseSelect, { props: { disabled: true } });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('base-select--disabled');
  });

  it('disables individual options when open', async () => {
    const wrapper = mount(BaseSelect, { props: { options: OPTIONS } });
    await wrapper.find('button').trigger('click');
    const cherryOption = wrapper.findAll('[role="option"]').find((o) => o.text() === 'Cherry')!;
    expect(cherryOption.attributes('aria-disabled')).toBe('true');
  });

  it('renders chevron icon', () => {
    const wrapper = mount(BaseSelect);
    expect(wrapper.find('.base-select__chevron').exists()).toBe(true);
  });

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseSelect, { props: { label: 'Hidden Label', labelHidden: true } });
    expect(wrapper.find('label').exists()).toBe(true);
    expect(wrapper.find('.base-select__label--hidden').exists()).toBe(true);
  });

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseSelect, { props: { label: 'Visible Label' } });
    expect(wrapper.find('.base-select__label--hidden').exists()).toBe(false);
  });
});
