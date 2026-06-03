import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseMenubar from './BaseMenubar.vue'

describe('BaseMenubar', () => {
  it('renders a ul with role menubar', () => {
    const wrapper = mountWithI18n(BaseMenubar)
    expect(wrapper.find('menu').attributes('role')).toBe('menubar')
  })

  it('has aria-label from prop', () => {
    const wrapper = mountWithI18n(BaseMenubar, { props: { label: 'Nav Menu' } })
    expect(wrapper.find('menu').attributes('aria-label')).toBe('Nav Menu')
  })

  it('applies bordered class when bordered prop is true', () => {
    const wrapper = mountWithI18n(BaseMenubar, { props: { bordered: true } })
    expect(wrapper.find('menu').classes()).toContain('base-menubar--bordered')
  })

  it('renders slot content', () => {
    const wrapper = mountWithI18n(BaseMenubar, { slots: { default: '<li role="menuitem">Item</li>' } })
    expect(wrapper.find('li').text()).toBe('Item')
  })
})
