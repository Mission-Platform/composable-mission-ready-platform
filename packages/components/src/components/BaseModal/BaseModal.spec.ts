import { describe, expect, it } from 'vitest'

import { mountWithI18n, createTestRouter } from '../../test-utils/mountWithI18n'

import BaseModal from './BaseModal.vue'

describe('BaseModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mountWithI18n(BaseModal, { props: { open: false }, attachTo: document.body })
    expect(document.querySelector('.base-modal-overlay')).toBeNull()
    wrapper.unmount()
  })

  it('renders overlay when open', () => {
    const wrapper = mountWithI18n(BaseModal, { props: { open: true, title: 'Test' }, attachTo: document.body })
    expect(document.querySelector('.base-modal-overlay')).toBeTruthy()
    wrapper.unmount()
  })

  it('renders title when provided', () => {
    const wrapper = mountWithI18n(BaseModal, { props: { open: true, title: 'Hello Modal' }, attachTo: document.body })
    expect(document.querySelector('.base-modal__title')?.textContent).toBe('Hello Modal')
    wrapper.unmount()
  })

  it('emits update:open false on close button click', async () => {
    const wrapper = mountWithI18n(BaseModal, {
      props: { open: true, title: 'Test' },
      attachTo: document.body,
    })
    const closeBtn = document.querySelector('.base-modal__close') as HTMLButtonElement
    closeBtn?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })

  it('applies size class', () => {
    const wrapper = mountWithI18n(BaseModal, { props: { open: true, size: 'lg' }, attachTo: document.body })
    expect(document.querySelector('.base-modal--lg')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits close when route changes and closeOnRouteChange is true', async () => {
    const router = createTestRouter()
    const wrapper = mountWithI18n(
      BaseModal,
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
      BaseModal,
      { props: { open: true, title: 'Test', closeOnRouteChange: false }, attachTo: document.body },
      router,
    )
    await router.push('/another-route')
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })
})
