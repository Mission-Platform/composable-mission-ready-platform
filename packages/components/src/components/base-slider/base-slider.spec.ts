import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseSlider from './base-slider.vue';

describe('BaseSlider', () => {
  it('renders a thumb with role="slider" and aria values', () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 40, min: 0, max: 100 } });
    const thumb = wrapper.find('[role="slider"]');
    expect(thumb.exists()).toBe(true);
    expect(thumb.attributes('aria-valuenow')).toBe('40');
    expect(thumb.attributes('aria-valuemin')).toBe('0');
    expect(thumb.attributes('aria-valuemax')).toBe('100');
    expect(thumb.attributes('tabindex')).toBe('0');
  });

  it('positions the fill and thumb according to the value', () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 25, min: 0, max: 100 } });
    expect((wrapper.find('.base-slider__fill').element as HTMLElement).style.width).toBe('25%');
    expect((wrapper.find('.base-slider__thumb').element as HTMLElement).style.left).toBe('25%');
  });

  it('clamps the displayed value to the range', () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 999, min: 0, max: 100 } });
    expect(wrapper.find('[role="slider"]').attributes('aria-valuenow')).toBe('100');
  });

  it('increments and decrements with arrow keys (respecting step)', async () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 50, step: 5 } });
    const thumb = wrapper.find('[role="slider"]');
    await thumb.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([55]);
    await thumb.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([45]);
  });

  it('jumps by 10 steps with Page Up/Down', async () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 50, step: 2 } });
    const thumb = wrapper.find('[role="slider"]');
    await thumb.trigger('keydown', { key: 'PageUp' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([70]);
    await thumb.trigger('keydown', { key: 'PageDown' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([30]);
  });

  it('jumps to min/max with Home/End', async () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 50, min: 10, max: 90 } });
    const thumb = wrapper.find('[role="slider"]');
    await thumb.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10]);
    await thumb.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([90]);
  });

  it('emits change on keyboard interaction', async () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 50 } });
    await wrapper.find('[role="slider"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('change')?.[0]).toEqual([51]);
  });

  it('does not respond to keys when disabled', async () => {
    const wrapper = mount(BaseSlider, { props: { modelValue: 50, disabled: true } });
    const thumb = wrapper.find('[role="slider"]');
    expect(thumb.attributes('tabindex')).toBe('-1');
    await thumb.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('uses formatValue for aria-valuetext and the displayed value', () => {
    const wrapper = mount(BaseSlider, {
      props: { modelValue: 50, showValue: true, formatValue: (v: number) => `${v}%` },
    });
    expect(wrapper.find('[role="slider"]').attributes('aria-valuetext')).toBe('50%');
    expect(wrapper.find('.base-slider__value').text()).toBe('50%');
  });
});
