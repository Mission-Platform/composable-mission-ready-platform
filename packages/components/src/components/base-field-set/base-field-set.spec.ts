import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseFieldSet from './base-field-set.vue';

describe('BaseFieldSet', () => {
  it('renders a semantic fieldset wrapping its default slot', () => {
    const wrapper = mount(BaseFieldSet, {
      slots: { default: '<input class="child" />' },
    });
    expect(wrapper.element.tagName).toBe('FIELDSET');
    expect(wrapper.find('.child').exists()).toBe(true);
  });

  it('renders the legend text when provided', () => {
    const wrapper = mount(BaseFieldSet, { props: { legend: 'Address' } });
    const legend = wrapper.find('legend');
    expect(legend.exists()).toBe(true);
    expect(legend.text()).toBe('Address');
  });

  it('omits the legend when neither the prop nor the slot is provided', () => {
    const wrapper = mount(BaseFieldSet);
    expect(wrapper.find('legend').exists()).toBe(false);
  });

  it('prefers the legend slot over the legend prop', () => {
    const wrapper = mount(BaseFieldSet, {
      props: { legend: 'Prop legend' },
      slots: { legend: '<span class="custom">Slot legend</span>' },
    });
    expect(wrapper.find('.custom').exists()).toBe(true);
    expect(wrapper.find('legend').text()).toBe('Slot legend');
  });

  it('renders the description when provided', () => {
    const wrapper = mount(BaseFieldSet, { props: { description: 'Where you live' } });
    expect(wrapper.find('.base-field-set__description').text()).toBe('Where you live');
  });

  it('disables the native fieldset (and its controls) when disabled', () => {
    const wrapper = mount(BaseFieldSet, { props: { disabled: true } });
    expect((wrapper.element as HTMLFieldSetElement).disabled).toBe(true);
  });

  it('drops the frame in flush mode', () => {
    const wrapper = mount(BaseFieldSet, { props: { flush: true } });
    expect(wrapper.classes()).toContain('base-field-set--flush');
  });
});
