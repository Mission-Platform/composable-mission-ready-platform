import { describe, expect, it } from 'vitest'

import { mountWithI18n, createTestRouter } from '../../test-utils/mountWithI18n'

import BaseSidebar from './BaseSidebar.vue'

describe('BaseSidebar', () => {
  it('renders nothing when closed', () => {
    const wrapper = mountWithI18n(BaseSidebar, {
      props: { open: false, title: 'Test' },
      attachTo: document.body,
    })
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('renders aside when open', () => {
    const wrapper = mountWithI18n(BaseSidebar, {
      props: { open: true, title: 'Test' },
      attachTo: document.body,
    })
    expect(document.querySelector('aside.base-sidebar')).toBeTruthy()
    wrapper.unmount()
  })

  it('renders title in header', () => {
    const wrapper = mountWithI18n(BaseSidebar, {
      props: { open: true, title: 'My Sidebar' },
      attachTo: document.body,
    })
    expect(document.querySelector('.base-sidebar__title')?.textContent).toBe('My Sidebar')
    wrapper.unmount()
  })

  it('applies correct side class', () => {
    const wrapper = mountWithI18n(BaseSidebar, {
      props: { open: true, title: 'Test', side: 'right' },
      attachTo: document.body,
    })
    expect(document.querySelector('.base-sidebar--right')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits close and update:open when route changes and closeOnRouteChange is true', async () => {
    const router = createTestRouter()
    const wrapper = mountWithI18n(
      BaseSidebar,
      { props: { open: true, title: 'Test', closeOnRouteChange: true }, attachTo: document.body },
      router,
    )
    await router.push('/test-route')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    wrapper.unmount()
  })

  it('does not emit close when route changes and closeOnRouteChange is false', async () => {
    const router = createTestRouter()
    const wrapper = mountWithI18n(
      BaseSidebar,
      { props: { open: true, title: 'Test', closeOnRouteChange: false }, attachTo: document.body },
      router,
    )
    await router.push('/another-route')
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })
})
