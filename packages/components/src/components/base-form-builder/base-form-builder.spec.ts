import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseFormBuilder from './base-form-builder.vue';
import { useFormSchema } from './use-form-schema';

import type { FormSchema } from './types';

// ─── useFormSchema unit tests ─────────────────────────────────────────────────

describe('useFormSchema', () => {
  const schema: FormSchema = {
    fields: [
      { key: 'name', label: 'Name', schema: z.string().min(2, 'Too short') },
      { key: 'age', type: 'number', label: 'Age' },
      { key: 'active', type: 'checkbox', label: 'Active' },
    ],
  };

  it('initialises values from field type defaults', () => {
    const { values } = useFormSchema(schema);
    expect(values.name).toBe('');
    expect(values.age).toBeUndefined();
    expect(values.active).toBe(false);
  });

  it('overlays caller-supplied initial values', () => {
    const { values } = useFormSchema(schema, { name: 'Alice', active: true });
    expect(values.name).toBe('Alice');
    expect(values.active).toBe(true);
  });

  it('validate() returns true when all field schemas pass', () => {
    const { values, validate } = useFormSchema(schema, { name: 'Alice' });
    values.name = 'Alice';
    expect(validate()).toBe(true);
  });

  it('validate() returns false and populates errors when field schema fails', () => {
    const { errors, validate } = useFormSchema(schema, { name: 'A' });
    const result = validate();
    expect(result).toBe(false);
    expect(errors.name).toBe('Too short');
  });

  it('validate() uses whole-form zodSchema when provided', () => {
    const s: FormSchema = {
      fields: [{ key: 'email', label: 'Email' }],
      zodSchema: z.object({ email: z.string().email('Bad email') }),
    };
    const { values, errors, validate } = useFormSchema(s, { email: 'not-an-email' });
    values.email = 'not-an-email';
    expect(validate()).toBe(false);
    expect(errors.email).toBe('Bad email');
  });

  it('validate() passes with valid whole-form zodSchema', () => {
    const s: FormSchema = {
      fields: [{ key: 'email', label: 'Email' }],
      zodSchema: z.object({ email: z.string().email() }),
    };
    const { values, validate } = useFormSchema(s, { email: 'test@example.com' });
    values.email = 'test@example.com';
    expect(validate()).toBe(true);
  });

  it('reset() restores default values and clears errors', () => {
    const { values, errors, validate, reset } = useFormSchema(schema, { name: 'A' });
    validate(); // populate errors
    values.name = 'Changed';
    reset();
    expect(values.name).toBe('A'); // restored to initial
    expect(errors.name).toBeUndefined();
  });

  it('isValid reflects latest validate() result', () => {
    const { values, isValid, validate } = useFormSchema(schema);
    values.name = 'Alice';
    validate();
    expect(isValid.value).toBe(true);
    values.name = 'A';
    validate();
    expect(isValid.value).toBe(false);
  });
});

// ─── BaseFormBuilder component tests ─────────────────────────────────────────

describe('BaseFormBuilder', () => {
  const baseSchema: FormSchema = {
    fields: [{ key: 'username', label: 'Username', placeholder: 'Enter username' }],
  };

  it('renders a <form> element', () => {
    const wrapper = mount(BaseFormBuilder, { props: { schema: baseSchema } });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('renders a text input field by default', () => {
    const wrapper = mount(BaseFormBuilder, { props: { schema: baseSchema } });
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
  });

  it('renders email input for email type', () => {
    const s: FormSchema = { fields: [{ key: 'email', type: 'email', label: 'Email' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
  });

  it('renders number input for number type', () => {
    const s: FormSchema = { fields: [{ key: 'count', type: 'number', label: 'Count' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
  });

  it('renders textarea for textarea type', () => {
    const s: FormSchema = { fields: [{ key: 'bio', type: 'textarea', label: 'Bio' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('renders markdown input for markdown type', () => {
    const s: FormSchema = { fields: [{ key: 'body', type: 'markdown', label: 'Body' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('.markdown-input').exists()).toBe(true);
  });

  it('renders checkbox for checkbox type', () => {
    const s: FormSchema = { fields: [{ key: 'agree', type: 'checkbox', label: 'Agree' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it('renders switch for switch type', () => {
    const s: FormSchema = { fields: [{ key: 'notify', type: 'switch', label: 'Notify' }] };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('input[role="switch"]').exists()).toBe(true);
  });

  it('renders select for select type', () => {
    const s: FormSchema = {
      fields: [
        {
          key: 'role',
          type: 'select',
          label: 'Role',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'User', value: 'user' },
          ],
        },
      ],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
  });

  it('renders radio group for radio type', () => {
    const s: FormSchema = {
      fields: [
        {
          key: 'plan',
          type: 'radio',
          label: 'Plan',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro', value: 'pro' },
          ],
        },
      ],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.findAll('input[type="radio"]').length).toBe(2);
  });

  it('renders multiple fields from schema', () => {
    const s: FormSchema = {
      fields: [
        { key: 'first', label: 'First' },
        { key: 'last', label: 'Last' },
        { key: 'email', type: 'email', label: 'Email' },
      ],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    expect(wrapper.findAll('input').length).toBe(3);
  });

  it('shows field labels', () => {
    const wrapper = mount(BaseFormBuilder, { props: { schema: baseSchema } });
    expect(wrapper.find('label').text()).toContain('Username');
  });

  it('emits update:modelValue when a field changes', async () => {
    const wrapper = mount(BaseFormBuilder, { props: { schema: baseSchema } });
    await wrapper.find('input').setValue('alice');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect((wrapper.emitted('update:modelValue')![0][0] as Record<string, unknown>).username).toBe('alice');
  });

  it('emits submit with values and isValid=true when form is valid', async () => {
    const s: FormSchema = {
      fields: [{ key: 'name', label: 'Name', schema: z.string().min(1) }],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    await wrapper.find('input').setValue('Alice');
    await wrapper.find('form').trigger('submit');
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(true);
  });

  it('emits submit with isValid=false when validation fails', async () => {
    const s: FormSchema = {
      fields: [{ key: 'name', label: 'Name', schema: z.string().min(5, 'Too short') }],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    await wrapper.find('input').setValue('Ab');
    await wrapper.find('form').trigger('submit');
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(false);
  });

  it('shows validation error messages on submit', async () => {
    const s: FormSchema = {
      fields: [{ key: 'name', label: 'Name', schema: z.string().min(5, 'Min 5 chars') }],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    await wrapper.find('input').setValue('Hi');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Min 5 chars');
  });

  it('clears errors and resets values on form reset', async () => {
    const s: FormSchema = {
      fields: [{ key: 'name', label: 'Name', schema: z.string().min(5, 'Too short') }],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s } });
    await wrapper.find('input').setValue('Hi');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Too short');
    await wrapper.find('form').trigger('reset');
    expect(wrapper.text()).not.toContain('Too short');
  });

  it('renders default Submit and Reset buttons', () => {
    const wrapper = mount(BaseFormBuilder, { props: { schema: baseSchema } });
    const buttons = wrapper.findAll('button');
    const texts = buttons.map((b) => b.text());
    expect(texts).toContain('Submit');
    expect(texts).toContain('Reset');
  });

  it('disables all fields when disabled prop is true', () => {
    const s: FormSchema = {
      fields: [
        { key: 'a', label: 'A' },
        { key: 'b', type: 'checkbox', label: 'B' },
      ],
    };
    const wrapper = mount(BaseFormBuilder, { props: { schema: s, disabled: true } });
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('disabled')).toBeDefined();
    }
  });

  it('supports slot override for actions', () => {
    const wrapper = mount(BaseFormBuilder, {
      props: { schema: baseSchema },
      slots: { actions: '<button type="submit">Save</button>' },
    });
    expect(wrapper.find('button').text()).toBe('Save');
    expect(wrapper.findAll('button').length).toBe(1);
  });
});
