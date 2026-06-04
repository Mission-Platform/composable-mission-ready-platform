import { describe, expect, it, vi } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseButton from './BaseButton.vue';

describe('BaseButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Click me' } });
    expect(wrapper.text()).toContain('Click me');
  });

  it('applies default classes', () => {
    const wrapper = mount(BaseButton);
    expect(wrapper.classes()).toContain('base-button--primary');
    expect(wrapper.classes()).toContain('base-button--md');
  });

  it('applies variant class', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'danger' } });
    expect(wrapper.classes()).toContain('base-button--danger');
  });

  it('applies size class', () => {
    const wrapper = mount(BaseButton, { props: { size: 'lg' } });
    expect(wrapper.classes()).toContain('base-button--lg');
  });

  it('renders a <button> element with correct type', () => {
    const wrapper = mount(BaseButton, { props: { type: 'submit' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('submit');
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } });
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('shows spinner and adds loading class when loading', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } });
    expect(wrapper.classes()).toContain('base-button--loading');
    const spinner = wrapper.find('.base-button__spinner');
    expect(spinner.exists()).toBe(true);
    expect(spinner.attributes('role')).toBe('status');
    expect(spinner.attributes('aria-label')).toBe('Loading…');
  });

  it('does not emit click when loading', async () => {
    const onClick = vi.fn();
    const wrapper = mount(BaseButton, { props: { loading: true }, attrs: { onClick } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('sets aria-busy when loading', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } });
    expect(wrapper.attributes('aria-busy')).toBe('true');
  });
});
