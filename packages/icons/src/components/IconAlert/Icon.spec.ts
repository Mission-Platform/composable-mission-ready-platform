import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import IconAlert from './Icon.vue'

describe('IconAlert', () => {
  it('renders an svg element', () => {
    const wrapper = mount(IconAlert)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('applies the correct class', () => {
    const wrapper = mount(IconAlert)
    expect(wrapper.find('svg').classes()).toContain('base-icon-alert')
  })

  it('applies named size token', () => {
    const wrapper = mount(IconAlert, { props: { size: 'lg' } })
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg')
  })

  it('applies numeric size as px', () => {
    const wrapper = mount(IconAlert, { props: { size: 32 } })
    expect(wrapper.find('svg').attributes('width')).toBe('32px')
  })
})
