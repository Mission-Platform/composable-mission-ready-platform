import { describe, expect, it, vi } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseMenu from './BaseMenu.vue'

const simpleItems = [
  { label: 'Dashboard', href: '#' },
  { label: 'Operations', href: '#' },
  { label: 'Settings', href: '#' },
]

const withSubmenus = [
  { label: 'Dashboard', href: '#' },
  {
    label: 'Operations',
    children: [
      { label: 'Active Missions', href: '#' },
      { label: 'Logistics', href: '#' },
    ],
  },
  { label: 'Settings', href: '#' },
]

const withMultipleSubmenus = [
  {
    label: 'Operations',
    children: [
      { label: 'Active Missions', href: '#' },
      { label: 'Logistics', href: '#' },
    ],
  },
  {
    label: 'Reports',
    children: [
      { label: 'Daily', href: '#' },
      { label: 'Weekly', href: '#' },
    ],
  },
]

describe('BaseMenu', () => {
  it('renders a nav element', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems } })
    expect(wrapper.find('nav').exists()).toBe(true)
  })

  it('renders a ul with role menubar', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems } })
    expect(wrapper.find('menu').attributes('role')).toBe('menubar')
  })

  it('renders the correct number of top-level items', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems } })
    expect(wrapper.findAll('li.base-menu__item')).toHaveLength(simpleItems.length)
  })

  it('applies vertical orientation class by default', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems } })
    expect(wrapper.find('nav').classes()).toContain('base-menu--vertical')
  })

  it('applies horizontal orientation class when set', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems, orientation: 'horizontal' } })
    expect(wrapper.find('nav').classes()).toContain('base-menu--horizontal')
  })

  it('renders an anchor tag for items with href and no children', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: simpleItems } })
    expect(wrapper.find('a').attributes('role')).toBe('menuitem')
  })

  it('renders a button for items with children', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons[0].attributes('aria-haspopup')).toBe('menu')
  })

  it('does not render submenu initially', () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('toggles submenu open on button click', async () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
  })

  it('closes submenu on second click', async () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    const button = wrapper.find('button')
    await button.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    await button.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('calls onClick when a non-href item is clicked', async () => {
    const onClick = vi.fn()
    const items = [{ label: 'Action', onClick }]
    const wrapper = mountWithI18n(BaseMenu, { props: { items } })
    await wrapper.find('button').trigger('click')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick for a disabled item', async () => {
    const onClick = vi.fn()
    const items = [{ label: 'Action', onClick, disabled: true }]
    const wrapper = mountWithI18n(BaseMenu, { props: { items } })
    await wrapper.find('button').trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies disabled class to disabled items', () => {
    const items = [{ label: 'Action', href: '#', disabled: true }]
    const wrapper = mountWithI18n(BaseMenu, { props: { items } })
    expect(wrapper.find('li').classes()).toContain('base-menu__item--disabled')
  })

  it('closes the open submenu when a different submenu is opened', async () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withMultipleSubmenus } })
    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')
    expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)
    expect(buttons[0].attributes('aria-expanded')).toBe('true')

    await buttons[1].trigger('click')
    expect(wrapper.findAll('[role="menu"]')).toHaveLength(1)
    expect(buttons[0].attributes('aria-expanded')).toBe('false')
    expect(buttons[1].attributes('aria-expanded')).toBe('true')
  })

  it('closes all submenus when Escape is pressed', async () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    const button = wrapper.find('button')

    await button.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('closes all submenus when clicking outside the menu', async () => {
    const wrapper = mountWithI18n(BaseMenu, { props: { items: withSubmenus } })
    const button = wrapper.find('button')

    await button.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    const outsideEvent = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(outsideEvent)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
