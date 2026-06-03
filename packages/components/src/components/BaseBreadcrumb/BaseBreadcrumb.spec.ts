import { describe, expect, it } from 'vitest'
import { RouterLink } from 'vue-router'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseBreadcrumb from './BaseBreadcrumb.vue'

import type { BreadcrumbItem } from './BaseBreadcrumb.vue'

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Current Page' },
]

describe('BaseBreadcrumb', () => {
  it('renders a nav element with aria-label', () => {
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items } })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Breadcrumb')
  })

  it('renders all items', () => {
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items } })
    expect(wrapper.findAll('li')).toHaveLength(3)
  })

  it('renders links for non-last items with href', () => {
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items } })
    expect(wrapper.findAll('a')).toHaveLength(2)
  })

  it('marks last item as aria-current page', () => {
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items } })
    const spans = wrapper.findAll('.base-breadcrumb__current')
    const last = spans[spans.length - 1]
    expect(last.attributes('aria-current')).toBe('page')
  })

  it('renders custom separator', () => {
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items, separator: '›' } })
    const seps = wrapper.findAll('.base-breadcrumb__separator')
    expect(seps[0].text()).toBe('›')
  })

  it('renders RouterLink for non-last items with to prop', () => {
    const routerItems: BreadcrumbItem[] = [
      { label: 'Home', to: '/' },
      { label: 'Products', to: '/products' },
      { label: 'Current Page' },
    ]
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items: routerItems } })
    const links = wrapper.findAllComponents(RouterLink)
    expect(links).toHaveLength(2)
    expect(links[0].props('to')).toBe('/')
    expect(links[1].props('to')).toBe('/products')
  })

  it('prefers to over href when both are provided', () => {
    const mixedItems: BreadcrumbItem[] = [
      { label: 'Home', to: '/', href: '/fallback' },
      { label: 'Current Page' },
    ]
    const wrapper = mountWithI18n(BaseBreadcrumb, { props: { items: mixedItems } })
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true)
  })
})
