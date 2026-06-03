import { describe, expect, it } from 'vitest'

import { mountWithI18n as mount } from '../../test-utils/mountWithI18n'

import BaseCheckbox from './BaseCheckbox.vue'

describe('BaseCheckbox', () => {
  it('renders a checkbox input', () => {
    const wrapper = mount(BaseCheckbox)
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('renders label text', () => {
    const wrapper = mount(BaseCheckbox, { props: { label: 'Accept terms' } })
    expect(wrapper.text()).toContain('Accept terms')
  })

  it('is checked when boolean modelValue is true', () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: true } })
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('is unchecked when boolean modelValue is false', () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: false } })
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
  })

  it('is checked when value is included in array modelValue', () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: ['a', 'b'], value: 'a' },
    })
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('is unchecked when value is not in array modelValue', () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: ['b'], value: 'a' },
    })
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:modelValue with true when checked (boolean mode)', async () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: false } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
  })

  it('emits update:modelValue with false when unchecked (boolean mode)', async () => {
    const wrapper = mount(BaseCheckbox, { props: { modelValue: true } })
    await wrapper.find('input').setValue(false)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('adds value to array on check (array mode)', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: ['b'], value: 'a' },
    })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['b', 'a']])
  })

  it('removes value from array on uncheck (array mode)', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: { modelValue: ['a', 'b'], value: 'a' },
    })
    await wrapper.find('input').setValue(false)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([['b']])
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseCheckbox, { props: { disabled: true } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('base-checkbox--disabled')
  })

  it('renders error message and adds error class', () => {
    const wrapper = mount(BaseCheckbox, { props: { error: 'Required' } })
    expect(wrapper.find('.base-checkbox__error').text()).toBe('Required')
    expect(wrapper.classes()).toContain('base-checkbox--error')
  })

  it('renders hint text', () => {
    const wrapper = mount(BaseCheckbox, { props: { hint: 'You must accept' } })
    expect(wrapper.find('.base-checkbox__hint').text()).toBe('You must accept')
  })

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseCheckbox, { props: { label: 'Hidden Label', labelHidden: true } })
    expect(wrapper.find('.base-checkbox__label').exists()).toBe(true)
    expect(wrapper.find('.base-checkbox__label--hidden').exists()).toBe(true)
  })

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseCheckbox, { props: { label: 'Visible Label' } })
    expect(wrapper.find('.base-checkbox__label--hidden').exists()).toBe(false)
  })
})
