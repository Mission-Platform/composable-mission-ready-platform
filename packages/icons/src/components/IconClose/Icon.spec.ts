import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import IconClose from './Icon.vue'

describe('IconClose', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconClose)
    expect(wrapper.exists()).toBe(true)
  })

  it('applies size prop', () => {
    const wrapper = mount(IconClose, { props: { size: 32 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('32px')
    expect(svg.attributes('height')).toBe('32px')
  })

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconClose, { props: { ariaLabel: 'Test label' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-label')).toBe('Test label')
    expect(svg.attributes('aria-hidden')).not.toBe('true')
  })

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconClose, { props: { ariaLabel: undefined } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBeTruthy()
  })
})
