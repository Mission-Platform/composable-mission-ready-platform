import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import IconDrawCircle from './Icon.vue'

describe('IconDrawCircle', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconDrawCircle)
    expect(wrapper.exists()).toBe(true)
  })

  it('applies size prop', () => {
    const wrapper = mount(IconDrawCircle, { props: { size: 32 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('32px')
    expect(svg.attributes('height')).toBe('32px')
  })

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconDrawCircle, { props: { ariaLabel: 'Test label' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-label')).toBe('Test label')
    expect(svg.attributes('aria-hidden')).not.toBe('true')
  })

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconDrawCircle, { props: { ariaLabel: undefined } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBeTruthy()
  })
})
