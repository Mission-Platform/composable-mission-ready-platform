import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseNavbar from './base-navbar.vue';

describe('BaseNavbar', () => {
  it('renders a header element', () => {
    const wrapper = mountWithI18n(BaseNavbar);
    expect(wrapper.find('header').exists()).toBe(true);
  });

  it('renders a nav with aria-label', () => {
    const wrapper = mountWithI18n(BaseNavbar);
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Main navigation');
  });

  it('renders brand name', () => {
    const wrapper = mountWithI18n(BaseNavbar, { props: { brand: 'MyApp' } });
    expect(wrapper.find('.base-navbar__brand').text()).toBe('MyApp');
  });

  it('applies sticky class', () => {
    const wrapper = mountWithI18n(BaseNavbar, { props: { sticky: true } });
    expect(wrapper.find('header').classes()).toContain('base-navbar--sticky');
  });

  it('renders default slot in center', () => {
    const wrapper = mountWithI18n(BaseNavbar, { slots: { default: '<a href="#">Link</a>' } });
    expect(wrapper.find('.base-navbar__center a').text()).toBe('Link');
  });

  it('renders end slot', () => {
    const wrapper = mountWithI18n(BaseNavbar, { slots: { end: '<button>Login</button>' } });
    expect(wrapper.find('.base-navbar__end button').text()).toBe('Login');
  });

  it('renders a hamburger button', () => {
    const wrapper = mountWithI18n(BaseNavbar, { attachTo: document.body });
    expect(wrapper.find('.base-navbar__hamburger').exists()).toBe(true);
    wrapper.unmount();
  });

  it('hamburger has aria-expanded false by default', () => {
    const wrapper = mountWithI18n(BaseNavbar, { attachTo: document.body });
    expect(wrapper.find('.base-navbar__hamburger').attributes('aria-expanded')).toBe('false');
    wrapper.unmount();
  });

  it('opens mobile sidebar when hamburger is clicked', async () => {
    const wrapper = mountWithI18n(BaseNavbar, {
      props: { brand: 'MyApp' },
      attachTo: document.body,
    });
    await wrapper.find('.base-navbar__hamburger').trigger('click');
    expect(wrapper.find('.base-navbar__hamburger').attributes('aria-expanded')).toBe('true');
    expect(document.querySelector('.base-sidebar')).toBeTruthy();
    wrapper.unmount();
  });

  it('closes mobile sidebar on second hamburger click', async () => {
    const wrapper = mountWithI18n(BaseNavbar, {
      props: { brand: 'MyApp' },
      attachTo: document.body,
    });
    await wrapper.find('.base-navbar__hamburger').trigger('click');
    await wrapper.find('.base-navbar__hamburger').trigger('click');
    expect(wrapper.find('.base-navbar__hamburger').attributes('aria-expanded')).toBe('false');
    expect(document.querySelector('.base-sidebar')).toBeNull();
    wrapper.unmount();
  });

  it('uses mobileTitle as sidebar title when provided', async () => {
    const wrapper = mountWithI18n(BaseNavbar, {
      props: { brand: 'MyApp', mobileTitle: 'Mobile Menu' },
      attachTo: document.body,
    });
    await wrapper.find('.base-navbar__hamburger').trigger('click');
    expect(document.querySelector('.base-sidebar')?.getAttribute('aria-label')).toBe('Mobile Menu');
    wrapper.unmount();
  });

  it('falls back to brand as sidebar title when mobileTitle is not provided', async () => {
    const wrapper = mountWithI18n(BaseNavbar, {
      props: { brand: 'MyApp' },
      attachTo: document.body,
    });
    await wrapper.find('.base-navbar__hamburger').trigger('click');
    expect(document.querySelector('.base-sidebar')?.getAttribute('aria-label')).toBe('MyApp');
    wrapper.unmount();
  });
});
