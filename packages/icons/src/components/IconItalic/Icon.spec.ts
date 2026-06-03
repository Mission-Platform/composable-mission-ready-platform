import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import IconItalic from './Icon.vue'

describe('IconItalic', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconItalic)
    expect(wrapper.exists()).toBe(true)
  })

  it('applies numeric size as px', () => {
    const wrapper = mount(IconItalic, { props: { size: 32 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('32px')
    expect(svg.attributes('height')).toBe('32px')
  })

  it('applies named size token', () => {
    const wrapper = mount(IconItalic, { props: { size: 'lg' } })
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg')
  })

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconItalic, { props: { ariaLabel: 'Test label' } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-label')).toBe('Test label')
    expect(svg.attributes('aria-hidden')).not.toBe('true')
  })

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconItalic, { props: { ariaLabel: undefined } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBeTruthy()
  })
})
