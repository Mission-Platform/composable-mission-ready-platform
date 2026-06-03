import { describe, expect, it } from 'vitest'

import { mountWithI18n as mount } from '../../test-utils/mountWithI18n'

import BaseTextarea from './BaseTextarea.vue'

describe('BaseTextarea', () => {
  it('renders a <textarea> element', () => {
    const wrapper = mount(BaseTextarea)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('applies default size class (md)', () => {
    const wrapper = mount(BaseTextarea)
    expect(wrapper.classes()).toContain('base-textarea--md')
  })

  it('applies custom size class', () => {
    const wrapper = mount(BaseTextarea, { props: { size: 'lg' } })
    expect(wrapper.classes()).toContain('base-textarea--lg')
  })

  it('sets rows attribute', () => {
    const wrapper = mount(BaseTextarea, { props: { rows: 6 } })
    expect(wrapper.find('textarea').attributes('rows')).toBe('6')
  })

  it('binds modelValue to textarea value', () => {
    const wrapper = mount(BaseTextarea, { props: { modelValue: 'hello world' } })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('hello world')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseTextarea)
    await wrapper.find('textarea').setValue('typed text')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['typed text'])
  })

  it('renders label when label prop is provided', () => {
    const wrapper = mount(BaseTextarea, { props: { label: 'Description', id: 'desc' } })
    expect(wrapper.find('label').text()).toContain('Description')
  })

  it('renders hint text', () => {
    const wrapper = mount(BaseTextarea, { props: { hint: 'Max 200 chars' } })
    expect(wrapper.find('.base-textarea__hint').text()).toBe('Max 200 chars')
  })

  it('renders error message and adds error class', () => {
    const wrapper = mount(BaseTextarea, { props: { error: 'Too long' } })
    expect(wrapper.find('.base-textarea__error').text()).toBe('Too long')
    expect(wrapper.classes()).toContain('base-textarea--error')
  })

  it('does not render hint when error is present', () => {
    const wrapper = mount(BaseTextarea, { props: { error: 'Err', hint: 'Hint' } })
    expect(wrapper.find('.base-textarea__hint').exists()).toBe(false)
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseTextarea, { props: { disabled: true } })
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('base-textarea--disabled')
  })

  it('shows required asterisk when required prop is true', () => {
    const wrapper = mount(BaseTextarea, { props: { label: 'Bio', required: true } })
    expect(wrapper.find('.base-textarea__required').exists()).toBe(true)
  })

  it('sets resize style on textarea', () => {
    const wrapper = mount(BaseTextarea, { props: { resize: 'none' } })
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).style.resize).toBe('none')
  })

  it('renders label visually hidden when labelHidden is true', () => {
    const wrapper = mount(BaseTextarea, { props: { label: 'Hidden Label', labelHidden: true } })
    expect(wrapper.find('label').exists()).toBe(true)
    expect(wrapper.find('.base-textarea__label--hidden').exists()).toBe(true)
  })

  it('renders label visible by default when labelHidden is false', () => {
    const wrapper = mount(BaseTextarea, { props: { label: 'Visible Label' } })
    expect(wrapper.find('.base-textarea__label--hidden').exists()).toBe(false)
  })
})
