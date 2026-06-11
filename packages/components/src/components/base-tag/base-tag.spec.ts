import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import BaseTag from './base-tag.vue';

describe('BaseTag', () => {
  it('renders the label text', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.find('.base-tag__label').text()).toBe('Vue');
  });

  it('renders a <span> element', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.element.tagName).toBe('SPAN');
  });

  it('applies default classes (default, md)', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.classes()).toContain('base-tag--default');
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

  it('does not render a remove button by default', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue' } });
    expect(wrapper.find('.base-tag__remove').exists()).toBe(false);
  });

  it('renders a remove button when removable is true and not disabled', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', removable: true } });
    const button = wrapper.find('.base-tag__remove');
    expect(button.exists()).toBe(true);
    expect(button.attributes('aria-label')).toBe('Remove Vue');
  });

  it('does not render a remove button when disabled even if removable', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', removable: true, disabled: true } });
    expect(wrapper.find('.base-tag__remove').exists()).toBe(false);
  });

  it('adds disabled class when disabled', () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', disabled: true } });
    expect(wrapper.classes()).toContain('base-tag--disabled');
  });

  it('emits remove event when remove button is clicked', async () => {
    const wrapper = mount(BaseTag, { props: { label: 'Vue', removable: true } });
    await wrapper.find('.base-tag__remove').trigger('click');
    expect(wrapper.emitted('remove')).toHaveLength(1);
  });

  it('does not emit remove when removable+disabled (button is not rendered)', () => {
    const onRemove = vi.fn();
    const wrapper = mount(BaseTag, {
      props: { label: 'Vue', removable: true, disabled: true },
      attrs: { onRemove },
    });
    expect(wrapper.find('.base-tag__remove').exists()).toBe(false);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
