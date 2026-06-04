import { describe, expect, it } from 'vitest';
import { RouterLink } from 'vue-router';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseMenuItem from './BaseMenuItem.vue';

describe('BaseMenuItem', () => {
  it('renders a li with role none and inner span with role menuitem', () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'Item' } });
    expect(wrapper.find('li').attributes('role')).toBe('none');
    expect(wrapper.find('[role="menuitem"]').exists()).toBe(true);
  });

  it('renders label', () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'File' } });
    expect(wrapper.find('li').text()).toBe('File');
  });

  it('applies active class', () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'Edit', active: true } });
    expect(wrapper.find('li').classes()).toContain('base-menu-item--active');
  });

  it('applies danger variant class', () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'Delete', variant: 'danger' } });
    expect(wrapper.find('li').classes()).toContain('base-menu-item--danger');
  });

  it('applies disabled state', () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'N/A', disabled: true } });
    expect(wrapper.find('[role="menuitem"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.find('li').classes()).toContain('base-menu-item--disabled');
  });

  it('emits click when clicked and not disabled', async () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'Click me' } });
    await wrapper.find('[role="menuitem"]').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mountWithI18n(BaseMenuItem, { props: { label: 'N/A', disabled: true } });
    await wrapper.find('[role="menuitem"]').trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('renders an anchor link when href is provided', () => {
    const wrapper = mountWithI18n(BaseMenuItem, {
      props: { label: 'External', href: 'https://example.com' },
    });
    const anchor = wrapper.find('a');
    expect(anchor.exists()).toBe(true);
    expect(anchor.attributes('href')).toBe('https://example.com');
  });

  it('renders a RouterLink when to is provided', () => {
    const wrapper = mountWithI18n(BaseMenuItem, {
      props: { label: 'Dashboard', to: '/dashboard' },
      global: { stubs: { RouterLink: false } },
    });
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
  });

  it('does not render a link when disabled even if to is provided', () => {
    const wrapper = mountWithI18n(BaseMenuItem, {
      props: { label: 'Restricted', to: '/admin', disabled: true },
    });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('span.base-menu-item__button').exists()).toBe(true);
  });
});
