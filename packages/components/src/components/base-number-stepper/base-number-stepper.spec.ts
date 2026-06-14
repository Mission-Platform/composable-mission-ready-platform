import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseNumberStepper from './base-number-stepper.vue';

describe('BaseNumberStepper', () => {
  it('renders a number input and stepper buttons', () => {
    const wrapper = mount(BaseNumberStepper, { props: { label: 'Qty' } });
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
    expect(wrapper.findAll('button').length).toBe(2);
  });

  it('emits the parsed numeric value on input', async () => {
    const wrapper = mount(BaseNumberStepper);
    await wrapper.find('input').setValue('42');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(42);
  });

  it('emits null when cleared', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 5 } });
    await wrapper.find('input').setValue('');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBeNull();
  });

  it('increments and decrements by the step', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 4, step: 3 } });
    const [dec, inc] = wrapper.findAll('button');
    await inc.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(7);
    await dec.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(1);
  });

  it('truncates to an integer when integer is set', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { integer: true } });
    await wrapper.find('input').setValue('3.9');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(3);
  });

  it('clamps to zero when unsigned', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { unsigned: true } });
    await wrapper.find('input').setValue('-5');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(0);
  });

  it('rounds to the configured float precision', async () => {
    const wrapper = mount(BaseNumberStepper, { props: { precision: 2 } });
    await wrapper.find('input').setValue('1.239');
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(1.24);
  });

  it('respects min/max bounds', () => {
    const wrapper = mount(BaseNumberStepper, { props: { modelValue: 10, max: 10 } });
    const inc = wrapper.findAll('button')[1];
    expect(inc.attributes('disabled')).toBeDefined();
  });
});
