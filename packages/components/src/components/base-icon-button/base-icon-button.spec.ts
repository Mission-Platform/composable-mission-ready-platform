import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseIconButton from './base-icon-button.vue';

describe('BaseIconButton', () => {
  it('renders a <button> element', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
  });

  it('renders slot content', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close' }, slots: { default: '<svg />' } });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies the label as aria-label', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close dialog' } });
    expect(wrapper.attributes('aria-label')).toBe('Close dialog');
  });

  it('applies default classes', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close' } });
    expect(wrapper.classes()).toContain('base-icon-button--ghost');
    expect(wrapper.classes()).toContain('base-icon-button--md');
  });

  it('applies variant class', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close', variant: 'danger' } });
    expect(wrapper.classes()).toContain('base-icon-button--danger');
  });

  it('applies size class', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close', size: 'sm' } });
    expect(wrapper.classes()).toContain('base-icon-button--sm');
  });

  it('defaults the native type to button', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close' } });
    expect(wrapper.attributes('type')).toBe('button');
  });

  it('honours an explicit type', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Submit', type: 'submit' } });
    expect(wrapper.attributes('type')).toBe('submit');
  });

  it('emits click when clicked', async () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close', disabled: true } });
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseIconButton, { props: { label: 'Close', disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });
});
