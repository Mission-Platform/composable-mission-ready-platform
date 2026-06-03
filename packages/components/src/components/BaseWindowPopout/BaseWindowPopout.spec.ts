import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseWindowPopout from './BaseWindowPopout.vue'

// Minimal mock for window.open that returns a fake Window-like object.
// `createElement` returns a *real* JSDOM element so Vue Teleport can insert into it.
function makeFakeWindow() {
  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {}
  // Re-use JSDOM's document for element creation so Teleport gets real DOM nodes.
  const container = document.createElement('div')
  const fakeDoc = {
    title: '',
    body: {
      style: { margin: '' },
      appendChild: vi.fn((el: Node) => document.body.appendChild(el)),
    },
    head: { appendChild: vi.fn() },
    createElement: vi.fn(() => container),
    querySelectorAll: vi.fn(() => []),
  }
  return {
    closed: false,
    document: fakeDoc,
    close: vi.fn(function (this: ReturnType<typeof makeFakeWindow>) {
      this.closed = true
    }),
    addEventListener: vi.fn((event: string, cb: EventListenerOrEventListenerObject) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
    }),
    _listeners: listeners,
    _container: container,
  }
}

describe('BaseWindowPopout', () => {
  let openSpy: ReturnType<typeof vi.spyOn>
  let fakeWin: ReturnType<typeof makeFakeWindow>

  beforeEach(() => {
    fakeWin = makeFakeWindow()
    openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders slot content inline by default', () => {
    const wrapper = mountWithI18n(BaseWindowPopout, {
      slots: { default: '<p class="content">Hello</p>' },
    })
    expect(wrapper.find('.content').exists()).toBe(true)
    expect(wrapper.find('.base-window-popout__inline').exists()).toBe(true)
  })

  it('shows a toggle button', () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    expect(wrapper.find('.base-window-popout__toggle').exists()).toBe(true)
    expect(wrapper.find('.base-window-popout__toggle').text()).toContain('Pop out')
  })

  it('calls window.open when toggle is clicked', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(openSpy).toHaveBeenCalledOnce()
  })

  it('sets isPopped to true after openPopout()', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect((wrapper.vm as InstanceType<typeof BaseWindowPopout>).isPopped).toBe(true)
  })

  it('shows placeholder when popped', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(wrapper.find('.base-window-popout__placeholder').exists()).toBe(true)
    expect(wrapper.find('.base-window-popout__inline').exists()).toBe(false)
  })

  it('toggle label changes to "Pop back in" when popped', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(wrapper.find('.base-window-popout__toggle').text()).toContain('Pop back in')
  })

  it('emits open event when popout is opened', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('closes popout and resets state when toggle is clicked again', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect((wrapper.vm as InstanceType<typeof BaseWindowPopout>).isPopped).toBe(false)
    expect(fakeWin.close).toHaveBeenCalledOnce()
  })

  it('emits close event when popout is closed via toggle', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('exposes openPopout and closePopout methods', () => {
    const wrapper = mountWithI18n(BaseWindowPopout)
    const vm = wrapper.vm as InstanceType<typeof BaseWindowPopout>
    expect(typeof vm.openPopout).toBe('function')
    expect(typeof vm.closePopout).toBe('function')
  })

  it('window.open receives custom width/height', async () => {
    const wrapper = mountWithI18n(BaseWindowPopout, {
      props: { width: 1024, height: 768 },
    })
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect(openSpy).toHaveBeenCalledWith('', '_blank', expect.stringContaining('width=1024'))
    expect(openSpy).toHaveBeenCalledWith('', '_blank', expect.stringContaining('height=768'))
  })

  it('does nothing if window.open returns null (popup blocked)', async () => {
    openSpy.mockReturnValueOnce(null)
    const wrapper = mountWithI18n(BaseWindowPopout)
    await wrapper.find('.base-window-popout__toggle').trigger('click')
    expect((wrapper.vm as InstanceType<typeof BaseWindowPopout>).isPopped).toBe(false)
    expect(wrapper.emitted('open')).toBeFalsy()
  })

  it('renders custom controls slot with scoped props', () => {
    const wrapper = mountWithI18n(BaseWindowPopout, {
      slots: {
        controls: '<button class="custom-btn">custom</button>',
      },
    })
    expect(wrapper.find('.custom-btn').exists()).toBe(true)
    expect(wrapper.find('.base-window-popout__toggle').exists()).toBe(false)
  })
})
