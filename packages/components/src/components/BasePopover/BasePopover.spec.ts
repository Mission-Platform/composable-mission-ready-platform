import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BasePopover from './BasePopover.vue'

describe('BasePopover', () => {
  it('renders trigger slot', () => {
    const wrapper = mountWithI18n(BasePopover, {
      slots: { trigger: '<button>Open</button>' },
    })
    expect(wrapper.find('button').text()).toBe('Open')
  })

  it('floating panel is hidden when open is false', () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: false },
      slots: { trigger: '<button>Open</button>', default: '<p>Content</p>' },
    })
    expect(wrapper.find('.base-popover').exists()).toBe(false)
  })

  it('floating panel is visible when open is true', () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: true },
      slots: { trigger: '<button>Open</button>', default: '<p>Content</p>' },
    })
    expect(wrapper.find('.base-popover').exists()).toBe(true)
  })

  it('slot content rendered inside panel', () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: true },
      slots: { default: '<p class="inner">Hello</p>' },
    })
    expect(wrapper.find('.inner').text()).toBe('Hello')
  })

  it('panel is a dialog element', () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: true },
    })
    expect(wrapper.find('dialog.base-popover').exists()).toBe(true)
  })

  it('applies data-placement attribute', () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: true, placement: 'top' },
    })
    // actualPlacement from Floating UI defaults to the given placement in JSDOM
    expect(wrapper.find('.base-popover').attributes('data-placement')).toBeTruthy()
  })

  it('emits update:open false when close triggered', async () => {
    const wrapper = mountWithI18n(BasePopover, {
      props: { open: true, closeOnOutsideClick: true },
      attachTo: document.body,
    })
    // Simulate mousedown outside
    const event = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })
})
