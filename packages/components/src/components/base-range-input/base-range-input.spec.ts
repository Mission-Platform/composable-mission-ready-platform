import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseRangeInput from './base-range-input.vue';

describe('BaseRangeInput', () => {
  it('renders a track and two thumbs', () => {
    const wrapper = mountWithI18n(BaseRangeInput);
    expect(wrapper.find('.base-range-input__track').exists()).toBe(true);
    expect(wrapper.find('.base-range-input__thumb--min').exists()).toBe(true);
    expect(wrapper.find('.base-range-input__thumb--max').exists()).toBe(true);
  });

  it('positions thumbs and fill from the model value', () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [25, 75], min: 0, max: 100 } });
    const min = wrapper.find('.base-range-input__thumb--min').attributes('style') ?? '';
    const max = wrapper.find('.base-range-input__thumb--max').attributes('style') ?? '';
    const fill = wrapper.find('.base-range-input__fill').attributes('style') ?? '';
    expect(min).toContain('left: 25%');
    expect(max).toContain('left: 75%');
    expect(fill).toContain('left: 25%');
    expect(fill).toContain('right: 25%');
  });

  it('exposes per-thumb aria bounds (thumbs cannot cross)', () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [20, 80], min: 0, max: 100 } });
    const min = wrapper.find('.base-range-input__thumb--min');
    const max = wrapper.find('.base-range-input__thumb--max');
    expect(min.attributes('aria-valuemin')).toBe('0');
    expect(min.attributes('aria-valuemax')).toBe('80');
    expect(min.attributes('aria-valuenow')).toBe('20');
    expect(max.attributes('aria-valuemin')).toBe('20');
    expect(max.attributes('aria-valuemax')).toBe('100');
    expect(max.attributes('aria-valuenow')).toBe('80');
  });

  it('increments the lower thumb with ArrowRight', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [20, 80], step: 5 } });
    await wrapper.find('.base-range-input__thumb--min').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[25, 80]]);
    expect(wrapper.emitted('change')?.at(-1)).toEqual([[25, 80]]);
  });

  it('decrements the upper thumb with ArrowLeft', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [20, 80], step: 10 } });
    await wrapper.find('.base-range-input__thumb--max').trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[20, 70]]);
  });

  it('prevents the lower thumb from crossing the upper one', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [70, 75], step: 10 } });
    await wrapper.find('.base-range-input__thumb--min').trigger('keydown', { key: 'PageUp' });
    const last = wrapper.emitted('update:modelValue')?.at(-1) as [number[]] | undefined;
    expect(last?.[0][0]).toBeLessThanOrEqual(75);
    expect(last?.[0][1]).toBe(75);
  });

  it('enforces minDistance between thumbs', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, {
      props: { modelValue: [35, 50], minDistance: 10, step: 10 },
    });
    await wrapper.find('.base-range-input__thumb--min').trigger('keydown', { key: 'ArrowRight' });
    // 45 would leave only a 5-unit gap; clamp keeps it at upper - minDistance (40).
    const last = wrapper.emitted('update:modelValue')?.at(-1) as [number[]] | undefined;
    expect(last?.[0][0]).toBe(40);
  });

  it('jumps to bounds with Home / End', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [30, 60], min: 0, max: 100 } });
    await wrapper.find('.base-range-input__thumb--min').trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[0, 60]]);
    await wrapper.find('.base-range-input__thumb--max').trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[30, 100]]);
  });

  it('does not emit when disabled', async () => {
    const wrapper = mountWithI18n(BaseRangeInput, { props: { modelValue: [20, 80], disabled: true } });
    await wrapper.find('.base-range-input__thumb--min').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('shows formatted values when showValue is set', () => {
    const wrapper = mountWithI18n(BaseRangeInput, {
      props: { modelValue: [10, 90], showValue: true, formatValue: (v: number) => `$${v}` },
    });
    const values = wrapper.findAll('.base-range-input__value').map((node) => node.text());
    expect(values).toEqual(['$10', '$90']);
  });
});
