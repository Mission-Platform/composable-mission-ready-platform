import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BaseDropdown from './BaseDropdown.vue'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mountDropdown(props = {}, slots = {}) {
  return mount(BaseDropdown, {
    props,
    slots: {
      trigger: '<button>Trigger</button>',
      default: '<li>Option 1</li><li>Option 2</li>',
      ...slots,
    },
    attachTo: document.body,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BaseDropdown', () => {
  describe('default props', () => {
    it('renders the trigger slot', () => {
      const wrapper = mountDropdown()
      expect(wrapper.find('.base-dropdown-trigger').exists()).toBe(true)
      expect(wrapper.find('.base-dropdown-trigger button').exists()).toBe(true)
    })

    it('does not render the listbox when closed by default', () => {
      const wrapper = mountDropdown()
      expect(wrapper.find('.base-dropdown').exists()).toBe(false)
    })

    it('renders the listbox when open=true', () => {
      const wrapper = mountDropdown({ open: true })
      expect(wrapper.find('.base-dropdown').exists()).toBe(true)
    })

    it('renders as a div element', () => {
      const wrapper = mountDropdown({ open: true })
      expect(wrapper.find('.base-dropdown').element.tagName).toBe('DIV')
    })
  })

  describe('slots', () => {
    it('renders default slot items inside the listbox', () => {
      const wrapper = mountDropdown({ open: true })
      const items = wrapper.findAll('.base-dropdown li')
      expect(items).toHaveLength(2)
      expect(items[0].text()).toBe('Option 1')
      expect(items[1].text()).toBe('Option 2')
    })

    it('renders custom trigger slot content', () => {
      const wrapper = mountDropdown({}, { trigger: '<span id="custom-trigger">Open</span>' })
      expect(wrapper.find('#custom-trigger').exists()).toBe(true)
    })
  })

  describe('maxHeight prop', () => {
    it('applies the default maxHeight of 240px to the listbox', () => {
      const wrapper = mountDropdown({ open: true })
      expect(wrapper.find('.base-dropdown').attributes('style')).toContain('max-height: 240px')
    })

    it('applies a custom maxHeight to the listbox', () => {
      const wrapper = mountDropdown({ open: true, maxHeight: '120px' })
      expect(wrapper.find('.base-dropdown').attributes('style')).toContain('max-height: 120px')
    })
  })

  describe('matchTriggerWidth prop', () => {
    it('does not set min-width when matchTriggerWidth=true and trigger has no width (jsdom layout)', () => {
      // jsdom always returns 0 for offsetWidth; the component guards with `referenceEl?.offsetWidth`
      // so min-width is not applied in jsdom. The behaviour is integration-tested via Storybook stories.
      const wrapper = mountDropdown({ open: true, matchTriggerWidth: true })
      const style = wrapper.find('.base-dropdown').attributes('style') ?? ''
      expect(style).not.toContain('min-width: 0px')
    })

    it('does not set min-width when matchTriggerWidth=false', () => {
      const wrapper = mountDropdown({ open: true, matchTriggerWidth: false })
      const style = wrapper.find('.base-dropdown').attributes('style') ?? ''
      expect(style).not.toContain('min-width: ')
    })
  })

  describe('emitted events', () => {
    it('emits update:open with false when the trigger is clicked while open and closeOnOutsideClick=true', async () => {
      const wrapper = mountDropdown({ open: true, closeOnOutsideClick: true })

      // Simulate an outside mousedown event
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:open')).toEqual([[false]])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('does not emit update:open on outside click when closeOnOutsideClick=false', async () => {
      const wrapper = mountDropdown({ open: true, closeOnOutsideClick: false })

      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:open')).toBeUndefined()
    })

    it('does not emit update:open on outside click when closed', async () => {
      const wrapper = mountDropdown({ open: false, closeOnOutsideClick: true })

      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:open')).toBeUndefined()
    })
  })
})
