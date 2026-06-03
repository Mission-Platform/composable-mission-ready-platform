import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseTooltip from './BaseTooltip.vue'

describe('BaseTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders trigger slot content', () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip text' },
      slots: { default: '<button>Hover</button>' },
    })
    expect(wrapper.find('button').text()).toBe('Hover')
  })

  it('tooltip is hidden by default', () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip' },
      slots: { default: '<button>X</button>' },
    })
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('shows tooltip on mouseenter', async () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip text', delay: 0 },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseenter')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    expect(wrapper.find('[role="tooltip"]').text()).toBe('Tip text')
  })

  it('hides tooltip on mouseleave', async () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip', delay: 0 },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseenter')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseleave')
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('does not show tooltip when disabled', async () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip', disabled: true },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseenter')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(false)
  })

  it('renders full text for really long content', async () => {
    const longContent =
      'This is a really long tooltip message that should wrap across multiple lines instead of being truncated or cut off in any way'
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: longContent, delay: 0 },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseenter')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    const tooltip = wrapper.find('[role="tooltip"]')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.text()).toBe(longContent)
  })

  it('applies placement class', async () => {
    const wrapper = mountWithI18n(BaseTooltip, {
      props: { content: 'Tip', placement: 'right', delay: 0 },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.base-tooltip-wrapper').trigger('mouseenter')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="tooltip"]').classes()).toContain('base-tooltip--right')
  })
})
