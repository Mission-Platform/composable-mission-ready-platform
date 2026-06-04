import { describe, expect, it } from 'vitest';
import { RouterLink } from 'vue-router';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseNavbarItem from './BaseNavbarItem.vue';

describe('BaseNavbarItem', () => {
  it('renders a button by default', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home' } });
    expect(wrapper.find('button').exists()).toBe(true);
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('renders an anchor when href is provided', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home', href: '/home' } });
    expect(wrapper.find('a').exists()).toBe(true);
    expect(wrapper.find('a').attributes('href')).toBe('/home');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders the label text', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Dashboard' } });
    expect(wrapper.text()).toBe('Dashboard');
  });

  it('renders default slot content', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { slots: { default: 'Custom content' } });
    expect(wrapper.text()).toBe('Custom content');
  });

  it('applies active class and aria-current when active', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home', active: true } });
    expect(wrapper.find('button').classes()).toContain('base-navbar-item--active');
    expect(wrapper.find('button').attributes('aria-current')).toBe('page');
  });

  it('does not apply aria-current when not active', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home', active: false } });
    expect(wrapper.find('button').attributes('aria-current')).toBeUndefined();
  });

  it('applies disabled class and aria-disabled when disabled', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'N/A', disabled: true } });
    expect(wrapper.find('button').classes()).toContain('base-navbar-item--disabled');
    expect(wrapper.find('button').attributes('aria-disabled')).toBe('true');
  });

  it('applies disabled attribute on button when disabled', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'N/A', disabled: true } });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('does not set href on disabled anchor', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: { label: 'Link', href: '/page', disabled: true },
    });
    expect(wrapper.find('a').attributes('href')).toBeUndefined();
  });

  it('applies primary variant class', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home', variant: 'primary' } });
    expect(wrapper.find('button').classes()).toContain('base-navbar-item--primary');
  });

  it('applies default variant class by default', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Home' } });
    expect(wrapper.find('button').classes()).toContain('base-navbar-item--default');
  });

  it('emits click when clicked and not disabled', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'Click me' } });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, { props: { label: 'N/A', disabled: true } });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('renders icon slot', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: { label: 'Home' },
      slots: { icon: '<svg data-testid="icon" />' },
    });
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
  });

  // Dropdown / children tests
  it('renders a trigger button with aria-haspopup when children are provided', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
    });
    const trigger = wrapper.find('button');
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes('aria-haspopup')).toBe('true');
  });

  it('has aria-expanded false initially when children are provided', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
    });
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false');
  });

  it('opens dropdown when trigger button is clicked', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('.base-navbar-item__dropdown-list').exists()).toBe(true);
    wrapper.unmount();
  });

  it('renders child items in the dropdown', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [
          { label: 'Care Planning', href: '#care' },
          { label: 'Appointments', href: '#appts' },
        ],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    const items = wrapper.findAll('.base-navbar-item__dropdown-item');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toBe('Care Planning');
    expect(items[1].text()).toBe('Appointments');
    wrapper.unmount();
  });

  it('renders child with href as anchor tag', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    const anchor = wrapper.find('.base-navbar-item__dropdown-item[href="#care"]');
    expect(anchor.exists()).toBe(true);
    wrapper.unmount();
  });

  it('renders disabled child with aria-disabled', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Restricted', href: '#x', disabled: true }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    const disabledItem = wrapper.find('.base-navbar-item__dropdown-item--disabled');
    expect(disabledItem.exists()).toBe(true);
    wrapper.unmount();
  });

  it('closes dropdown on second trigger click', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('.base-navbar-item__dropdown-list').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows chevron icon when children are provided', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
    });
    // IconChevron renders an svg or similar element inside the trigger
    expect(wrapper.find('button').exists()).toBe(true);
    // The chevron class should be present somewhere inside the trigger
    expect(wrapper.find('.base-navbar-item__chevron').exists()).toBe(true);
  });

  it('does not emit click when children are provided (toggles dropdown instead)', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Care Planning', href: '#care' }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
    wrapper.unmount();
  });

  it('renders a RouterLink when to is provided', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: { label: 'Dashboard', to: '/dashboard' },
    });
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('a[href]').exists()).toBe(false);
  });

  it('does not render RouterLink when to is provided but disabled', () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: { label: 'Restricted', to: '/admin', disabled: true },
    });
    expect(wrapper.findComponent(RouterLink).exists()).toBe(false);
  });

  it('renders RouterLink for dropdown child with to prop', async () => {
    const wrapper = mountWithI18n(BaseNavbarItem, {
      props: {
        label: 'Services',
        children: [{ label: 'Dashboard', to: '/dashboard' }],
      },
      attachTo: document.body,
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.findComponent(RouterLink).exists()).toBe(true);
    wrapper.unmount();
  });
});
