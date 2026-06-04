import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import BaseTag from './BaseTag.vue';

describe('BaseTag', () => {
  it('renders the label text', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.find('.base-tag__label').text()).toBe('Vue');
  });

  it('renders a <span> element', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.element.tagName).toBe('SPAN');
  });

  it('applies default classes (neutral, md)', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.classes()).toContain('base-tag--neutral');
    expect(wrapper.classes()).toContain('base-tag--md');
  });

  it('applies variant class', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', variant: 'primary' } });
    expect(wrapper.classes()).toContain('base-tag--primary');
  });

  it('applies size class sm', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', size: 'sm' } });
    expect(wrapper.classes()).toContain('base-tag--sm');
  });

  it('renders a remove button when not disabled', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    const button = wrapper.find('.base-tag__remove');
    expect(button.exists()).toBe(true);
    expect(button.attributes('aria-label')).toBe('Remove Vue');
  });

  it('does not render a remove button when disabled', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', disabled: true } });
    expect(wrapper.find('.base-tag__remove').exists()).toBe(false);
  });

  it('adds disabled class when disabled', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', disabled: true } });
    expect(wrapper.classes()).toContain('base-tag--disabled');
  });

  it('emits remove event when remove button is clicked', async () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    await wrapper.find('.base-tag__remove').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });

  it('does not emit remove when remove button click is suppressed via disabled', () => {
    const onRemove = vi.fn();
    const wrapper = mount(BaseTag, { props: { label: 'Vue', disabled: true }, attrs: { onRemove } });
    expect(wrapper.find('.base-tag__remove').exists()).toBe(false);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
