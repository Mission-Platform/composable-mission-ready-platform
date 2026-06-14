import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseSchemaForm from './base-schema-form.vue';
import { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from './json-schema';
import { useSchemaForm } from './use-schema-form';

import type { FormJsonSchema } from './types';

// ─── jsonSchemaToFields / createFormValidator unit tests ─────────────────────

describe('jsonSchemaToFields', () => {
  it('derives ordered fields from the JSON Schema properties', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        age: { type: 'number', title: 'Age' },
      },
    };
    const fields = jsonSchemaToFields(schema);
    expect(fields.map((f) => f.key)).toEqual(['name', 'age']);
    expect(fields[0].label).toBe('Name');
  });

  it('infers widget from type, format and enum', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        count: { type: 'number' },
        agree: { type: 'boolean' },
        plan: { type: 'string', enum: ['free', 'pro'] },
        plain: { type: 'string' },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f.type]));
    expect(byKey.email).toBe('email');
    expect(byKey.count).toBe('number');
    expect(byKey.agree).toBe('checkbox');
    expect(byKey.plan).toBe('select');
    expect(byKey.plain).toBe('text');
  });

  it('honours an explicit ui.widget override', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        bio: { type: 'string', ui: { widget: 'textarea', rows: 4 } },
        darkMode: { type: 'boolean', ui: { widget: 'switch' } },
        role: { type: 'string', enum: ['a', 'b'], ui: { widget: 'radio' } },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f]));
    expect(byKey.bio.type).toBe('textarea');
    expect(byKey.bio.rows).toBe(4);
    expect(byKey.darkMode.type).toBe('switch');
    expect(byKey.role.type).toBe('radio');
  });

  it('builds options from enum (with enumLabels) and oneOf', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          enum: ['free', 'pro'],
          ui: { enumLabels: { free: 'Free', pro: 'Pro' } },
        },
        role: {
          type: 'string',
          oneOf: [
            { const: 'admin', title: 'Admin' },
            { const: 'user', title: 'User' },
          ],
        },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f]));
    expect(byKey.plan.options).toEqual([
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ]);
    expect(byKey.role.options).toEqual([
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
    ]);
  });

  it('marks fields listed in `required`', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
      required: ['a'],
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f.required]));
    expect(byKey.a).toBe(true);
    expect(byKey.b).toBe(false);
  });
});

describe('createFormValidator', () => {
  it('returns no errors for valid values', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
      },
      required: ['name', 'email'],
    });
    expect(validator.validate({ name: 'Al', email: 'a@b.com' })).toEqual({});
  });

  it('reports an error when a required string is empty', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    });
    const errors = validator.validate({ name: '' });
    expect(errors.name).toBeTruthy();
  });

  it('allows empty values for non-required fields', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { nick: { type: 'string', minLength: 3 } },
    });
    expect(validator.validate({ nick: '' })).toEqual({});
  });

  it('rejects an invalid email format', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
      required: ['email'],
    });
    expect(validator.validate({ email: 'not-an-email' }).email).toBeTruthy();
    expect(validator.validate({ email: 'a@b.com' })).toEqual({});
  });

  it('coerces numeric input and enforces minimum', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { age: { type: 'integer', minimum: 18 } },
      required: ['age'],
    });
    expect(validator.validate({ age: '21' })).toEqual({});
    expect(validator.validate({ age: '17' }).age).toBeTruthy();
  });

  it('requires required booleans to be true', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { agree: { type: 'boolean' } },
      required: ['agree'],
    });
    expect(validator.validate({ agree: false }).agree).toBeTruthy();
    expect(validator.validate({ agree: true })).toEqual({});
  });

  it('uses custom errorMessage overrides', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 5, errorMessage: { minLength: 'Min 5 chars' } },
      },
      required: ['name'],
    });
    expect(validator.validate({ name: 'Hi' }).name).toBe('Min 5 chars');
  });

  it('exposes the compiled standard JSON Schema', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    expect(validator.jsonSchema.type).toBe('object');
    expect(validator.jsonSchema.required).toEqual(['name']);
  });

  it('routes generated messages through the supplied translate function', () => {
    const translate = vi.fn(
      (key: string, named?: Record<string, unknown>) => `${key}|${String(named?.label)}|${String(named?.limit ?? '')}`,
    );
    const validator = createFormValidator(
      {
        type: 'object',
        properties: { name: { type: 'string', title: 'Name', minLength: 5 } },
        required: ['name'],
      },
      translate,
    );
    expect(validator.validate({ name: 'Hi' }).name).toBe('errors.minLength|Name|5');
    expect(translate).toHaveBeenCalledWith('errors.minLength', { label: 'Name', limit: 5 });
  });

  it('localises the "required" message via the translate function', () => {
    const translate = vi.fn((key: string, named?: Record<string, unknown>) =>
      key === 'errors.required' ? `${String(named?.label)} est obligatoire` : key,
    );
    const validator = createFormValidator(
      {
        type: 'object',
        properties: { name: { type: 'string', title: 'Nom' } },
        required: ['name'],
      },
      translate,
    );
    expect(validator.validate({ name: '' }).name).toBe('Nom est obligatoire');
  });

  it('leaves author-supplied errorMessage overrides untranslated', () => {
    const translate = vi.fn(() => 'TRANSLATED');
    const validator = createFormValidator(
      {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 5, errorMessage: { minLength: 'Min 5 chars' } },
        },
        required: ['name'],
      },
      translate,
    );
    expect(validator.validate({ name: 'Hi' }).name).toBe('Min 5 chars');
    expect(translate).not.toHaveBeenCalled();
  });

  it('falls back to built-in English messages when no translate fn is given', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { name: { type: 'string', title: 'Name', minLength: 5 } },
      required: ['name'],
    });
    expect(validator.validate({ name: 'Hi' }).name).toBe('Name must be at least 5 character(s)');
  });
});

// ─── useSchemaForm unit tests ─────────────────────────────────────────────────

describe('useSchemaForm', () => {
  const schema: FormJsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name', minLength: 2, errorMessage: { minLength: 'Too short' } },
      age: { type: 'number', title: 'Age' },
      active: { type: 'boolean', title: 'Active' },
    },
    required: ['name'],
  };

  it('exposes fields derived from the JSON Schema', () => {
    const { fields } = useSchemaForm(schema);
    expect(fields.map((f) => f.key)).toEqual(['name', 'age', 'active']);
  });

  it('initialises values from field type defaults', () => {
    const { values } = useSchemaForm(schema);
    expect(values.name).toBe('');
    expect(values.age).toBeUndefined();
    expect(values.active).toBe(false);
  });

  it('overlays caller-supplied initial values', () => {
    const { values } = useSchemaForm(schema, { name: 'Alice', active: true });
    expect(values.name).toBe('Alice');
    expect(values.active).toBe(true);
  });

  it('validate() returns true when all generated rules pass', () => {
    const { values, validate } = useSchemaForm(schema, { name: 'Alice' });
    values.name = 'Alice';
    expect(validate()).toBe(true);
  });

  it('validate() returns false and populates errors when a rule fails', () => {
    const { errors, validate } = useSchemaForm(schema, { name: 'A' });
    const result = validate();
    expect(result).toBe(false);
    expect(errors.name).toBe('Too short');
  });

  it('validate() handles email format generated from the schema', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { email: { type: 'string', format: 'email', errorMessage: { format: 'Bad email' } } },
      required: ['email'],
    };
    const { values, errors, validate } = useSchemaForm(s, { email: 'not-an-email' });
    values.email = 'not-an-email';
    expect(validate()).toBe(false);
    expect(errors.email).toBe('Bad email');
  });

  it('reset() restores default values and clears errors', () => {
    const { values, errors, validate, reset } = useSchemaForm(schema, { name: 'A' });
    validate(); // populate errors
    values.name = 'Changed';
    reset();
    expect(values.name).toBe('A'); // restored to initial
    expect(errors.name).toBeUndefined();
  });

  it('isValid reflects latest validate() result', () => {
    const { values, isValid, validate } = useSchemaForm(schema);
    values.name = 'Alice';
    validate();
    expect(isValid.value).toBe(true);
    values.name = 'A';
    validate();
    expect(isValid.value).toBe(false);
  });
});

// ─── BaseSchemaForm component tests ──────────────────────────────────────────

describe('BaseSchemaForm', () => {
  const baseSchema: FormJsonSchema = {
    type: 'object',
    properties: { username: { type: 'string', title: 'Username', ui: { placeholder: 'Enter username' } } },
  };

  it('renders a <form> element', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: baseSchema } });
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('renders a text input field by default', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: baseSchema } });
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
  });

  it('renders email input for email format', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { email: { type: 'string', format: 'email', title: 'Email' } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
  });

  it('renders number input for number type', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { count: { type: 'number', title: 'Count' } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
  });

  it('renders textarea for textarea widget', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { bio: { type: 'string', title: 'Bio', ui: { widget: 'textarea' } } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('renders markdown input for markdown widget', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { body: { type: 'string', title: 'Body', ui: { widget: 'markdown' } } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('.markdown-input').exists()).toBe(true);
  });

  it('renders checkbox for boolean type', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { agree: { type: 'boolean', title: 'Agree' } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it('renders switch for switch widget', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { notify: { type: 'boolean', title: 'Notify', ui: { widget: 'switch' } } },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('input[role="switch"]').exists()).toBe(true);
  });

  it('renders select for enum properties', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          title: 'Role',
          oneOf: [
            { const: 'admin', title: 'Admin' },
            { const: 'user', title: 'User' },
          ],
        },
      },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
  });

  it('renders radio group for radio widget', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          title: 'Plan',
          ui: { widget: 'radio' },
          oneOf: [
            { const: 'free', title: 'Free' },
            { const: 'pro', title: 'Pro' },
          ],
        },
      },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.findAll('input[type="radio"]').length).toBe(2);
  });

  it('renders multiple fields from schema', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        first: { type: 'string', title: 'First' },
        last: { type: 'string', title: 'Last' },
        email: { type: 'string', format: 'email', title: 'Email' },
      },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    expect(wrapper.findAll('input').length).toBe(3);
  });

  it('shows field labels', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: baseSchema } });
    expect(wrapper.find('label').text()).toContain('Username');
  });

  it('emits update:modelValue when a field changes', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: baseSchema } });
    await wrapper.find('input').setValue('alice');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect((wrapper.emitted('update:modelValue')![0][0] as Record<string, unknown>).username).toBe('alice');
  });

  it('emits submit with values and isValid=true when form is valid', async () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name', minLength: 1 } },
      required: ['name'],
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    await wrapper.find('input').setValue('Alice');
    await wrapper.find('form').trigger('submit');
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(true);
  });

  it('emits submit with isValid=false when validation fails', async () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name', minLength: 5, errorMessage: 'Too short' } },
      required: ['name'],
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    await wrapper.find('input').setValue('Ab');
    await wrapper.find('form').trigger('submit');
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(false);
  });

  it('shows validation error messages on submit', async () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name', minLength: 5, errorMessage: { minLength: 'Min 5 chars' } },
      },
      required: ['name'],
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    await wrapper.find('input').setValue('Hi');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Min 5 chars');
  });

  it('renders generated (non-override) messages through the local i18n scope', async () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    await wrapper.find('form').trigger('submit');
    // The label and limit are interpolated by vue-i18n from the `errors.*` keys
    // defined in the component's local `<i18n>` block.
    expect(wrapper.text()).toContain('Name is required');
  });

  it('clears errors and resets values on form reset', async () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name', minLength: 5, errorMessage: { minLength: 'Too short' } },
      },
      required: ['name'],
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s } });
    await wrapper.find('input').setValue('Hi');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Too short');
    await wrapper.find('form').trigger('reset');
    expect(wrapper.text()).not.toContain('Too short');
  });

  it('renders default Submit and Reset buttons', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: baseSchema } });
    const buttons = wrapper.findAll('button');
    const texts = buttons.map((b) => b.text());
    expect(texts).toContain('Submit');
    expect(texts).toContain('Reset');
  });

  it('disables all fields when disabled prop is true', () => {
    const s: FormJsonSchema = {
      type: 'object',
      properties: {
        a: { type: 'string', title: 'A' },
        b: { type: 'boolean', title: 'B' },
      },
    };
    const wrapper = mount(BaseSchemaForm, { props: { schema: s, disabled: true } });
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('disabled')).toBeDefined();
    }
  });

  it('supports slot override for actions', () => {
    const wrapper = mount(BaseSchemaForm, {
      props: { schema: baseSchema },
      slots: { actions: '<button type="submit">Save</button>' },
    });
    expect(wrapper.find('button').text()).toBe('Save');
    expect(wrapper.findAll('button').length).toBe(1);
  });
});

// ─── field sets (nested object properties) ───────────────────────────────────

describe('BaseSchemaForm field sets', () => {
  const fieldSetSchema: FormJsonSchema = {
    type: 'object',
    properties: {
      fullName: { type: 'string', title: 'Full name' },
      address: {
        type: 'object',
        title: 'Address',
        description: 'Where you live',
        properties: {
          street: { type: 'string', title: 'Street' },
          city: { type: 'string', title: 'City' },
        },
        required: ['street'],
      },
    },
    required: ['fullName'],
  };

  it('derives a fieldset field carrying its own nested fields', () => {
    const fields = jsonSchemaToFields(fieldSetSchema);
    const group = fields.find((f) => f.key === 'address');
    expect(group?.type).toBe('fieldset');
    expect(group?.label).toBe('Address');
    expect(group?.fields?.map((f) => f.key)).toEqual(['street', 'city']);
    expect(group?.fields?.find((f) => f.key === 'street')?.required).toBe(true);
  });

  it('treats a bare object property (no ui.widget) as a fieldset', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { meta: { type: 'object', properties: { a: { type: 'string' } } } },
    });
    expect(fields[0].type).toBe('fieldset');
    expect(fields[0].fields?.[0].key).toBe('a');
  });

  it('builds a nested default object for a field set', () => {
    const defaults = jsonSchemaDefaults(fieldSetSchema);
    expect(defaults.address).toEqual({ street: '', city: '' });
  });

  it('validates a nested required child under its dotted path', () => {
    const validator = createFormValidator(fieldSetSchema);
    const errors = validator.validate({ fullName: 'Ada', address: { street: '', city: '' } });
    expect(errors['address.street']).toBeTruthy();
    expect(errors.fullName).toBeUndefined();

    const ok = validator.validate({ fullName: 'Ada', address: { street: '221B', city: '' } });
    expect(ok['address.street']).toBeUndefined();
  });

  it('renders a field set with a legend and its nested child inputs', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: fieldSetSchema } });
    const fieldset = wrapper.find('fieldset.base-field-set');
    expect(fieldset.exists()).toBe(true);
    expect(fieldset.find('legend').text()).toContain('Address');
    // fullName + street + city → three text inputs in total.
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(3);
  });

  it('emits a nested value object when a field-set child changes', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: fieldSetSchema } });
    // Inputs render in schema order: fullName, street, city.
    const inputs = wrapper.findAll('input[type="text"]');
    await inputs[1].setValue('221B Baker Street');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    const last = emitted!.at(-1)![0] as { address: { street: string } };
    expect(last.address.street).toBe('221B Baker Street');
  });

  it('shows a nested required error on the field-set child on submit', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: fieldSetSchema } });
    await wrapper.find('input[type="text"]').setValue('Ada');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Street is required');
  });
});

// ─── useSchemaForm wizard tests ───────────────────────────────────────────────

describe('useSchemaForm (wizard)', () => {
  const wizardSteps: FormJsonSchema[] = [
    { type: 'object', title: 'One', properties: { a: { type: 'string', title: 'A', minLength: 2 } }, required: ['a'] },
    { type: 'object', title: 'Two', properties: { b: { type: 'string', title: 'B' } }, required: ['b'] },
  ];

  it('flags wizard mode and exposes one step per array entry', () => {
    const form = useSchemaForm(wizardSteps);
    expect(form.isWizard).toBe(true);
    expect(form.steps.length).toBe(2);
    expect(form.steps[0].title).toBe('One');
    expect(form.fields.map((f) => f.key)).toEqual(['a', 'b']);
  });

  it('treats a single object schema as a one-step (non-wizard) form', () => {
    const form = useSchemaForm({ type: 'object', properties: { a: { type: 'string' } } });
    expect(form.isWizard).toBe(false);
    expect(form.steps.length).toBe(1);
  });

  it('next() validates the current step and only advances when it is valid', () => {
    const form = useSchemaForm(wizardSteps);
    expect(form.next()).toBe(false);
    expect(form.currentStep.value).toBe(0);
    expect(form.errors.a).toBeTruthy();

    form.values.a = 'ok';
    expect(form.next()).toBe(true);
    expect(form.currentStep.value).toBe(1);
  });

  it('prev() goes back to the previous step without validating', () => {
    const form = useSchemaForm(wizardSteps, { a: 'ok' });
    form.next();
    expect(form.currentStep.value).toBe(1);
    form.previous();
    expect(form.currentStep.value).toBe(0);
  });

  it('validate() checks every step against the single shared values bag', () => {
    const form = useSchemaForm(wizardSteps, { a: 'ok' });
    expect(form.validate()).toBe(false);
    expect(form.errors.b).toBeTruthy();

    form.values.b = 'hi';
    expect(form.validate()).toBe(true);
  });

  it('reset() returns to the first step and clears errors', () => {
    const form = useSchemaForm(wizardSteps, { a: 'ok' });
    form.next();
    form.validate();
    expect(form.currentStep.value).toBe(1);
    form.reset();
    expect(form.currentStep.value).toBe(0);
    expect(form.errors.b).toBeUndefined();
  });

  it('stepHasErrors flags exactly the steps whose fields currently error', () => {
    const form = useSchemaForm(wizardSteps);
    expect(form.stepHasErrors.value).toEqual([false, false]);

    // A whole-form validate fails both required fields (one per step).
    form.validate();
    expect(form.stepHasErrors.value).toEqual([true, true]);

    // Fixing step one's field clears only its flag after re-validation.
    form.values.a = 'ok';
    form.validate();
    expect(form.stepHasErrors.value).toEqual([false, true]);

    // Clearing all errors (reset) clears every flag.
    form.reset();
    expect(form.stepHasErrors.value).toEqual([false, false]);
  });
});

// ─── useSchemaForm conditional wizard step tests ──────────────────────────────

describe('useSchemaForm (wizard step conditions)', () => {
  const conditionalSteps: FormJsonSchema[] = [
    { type: 'object', title: 'One', properties: { kind: { type: 'string', title: 'Kind' } } },
    {
      type: 'object',
      title: 'Two',
      visibleWhen: { allOf: [{ field: 'kind', equals: 'biz' }] },
      properties: { company: { type: 'string', title: 'Company' } },
      required: ['company'],
    },
    { type: 'object', title: 'Three', properties: { note: { type: 'string', title: 'Note' } } },
  ];

  it('omits a conditional step from the visible indices until its condition holds', () => {
    const form = useSchemaForm(conditionalSteps);
    expect(form.visibleStepIndices.value).toEqual([0, 2]);

    form.values.kind = 'biz';
    expect(form.visibleStepIndices.value).toEqual([0, 1, 2]);
  });

  it('next() skips a hidden step and advances to the next visible one', () => {
    const form = useSchemaForm(conditionalSteps);
    expect(form.currentStep.value).toBe(0);
    expect(form.next()).toBe(true);
    // Step 1 is hidden (kind ≠ biz), so navigation lands on step 2.
    expect(form.currentStep.value).toBe(2);
  });

  it('next() lands on the conditional step once it becomes visible', () => {
    const form = useSchemaForm(conditionalSteps, { kind: 'biz' });
    expect(form.next()).toBe(true);
    expect(form.currentStep.value).toBe(1);
  });

  it('validate() ignores hidden steps, so a required field on one never blocks', () => {
    const form = useSchemaForm(conditionalSteps);
    // `company` is required but lives on the hidden step → form is still valid.
    expect(form.validate()).toBe(true);
  });

  it('validate() enforces a conditional step once it is visible', () => {
    const form = useSchemaForm(conditionalSteps, { kind: 'biz' });
    expect(form.validate()).toBe(false);
    expect(form.errors.company).toBeTruthy();

    form.values.company = 'Acme';
    expect(form.validate()).toBe(true);
  });

  it('snaps off a step that becomes hidden after a value change', async () => {
    const form = useSchemaForm(conditionalSteps, { kind: 'biz' });
    form.goTo(1);
    expect(form.currentStep.value).toBe(1);

    form.values.kind = 'personal';
    await nextTick();
    expect(form.visibleStepIndices.value).toEqual([0, 2]);
    expect(form.currentStep.value).not.toBe(1);
  });

  it('keeps the first step when every step is conditionally hidden', () => {
    const form = useSchemaForm([
      { type: 'object', title: 'Only', visibleWhen: { allOf: [{ field: 'x', truthy: true }] }, properties: {} },
    ]);
    expect(form.visibleStepIndices.value).toEqual([0]);
  });
});

// ─── BaseSchemaForm wizard component tests ────────────────────────────────────

describe('BaseSchemaForm (wizard)', () => {
  const wizardSchema: FormJsonSchema[] = [
    {
      type: 'object',
      title: 'Account',
      properties: { username: { type: 'string', title: 'Username', minLength: 3 } },
      required: ['username'],
    },
    {
      type: 'object',
      title: 'Profile',
      properties: { bio: { type: 'string', title: 'Bio', ui: { widget: 'textarea' } } },
    },
  ];

  it('renders the wizard and only the current step fields', () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: wizardSchema } });
    expect(wrapper.find('.base-form-wizard').exists()).toBe(true);
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('textarea').exists()).toBe(false);
  });

  it('blocks advancing until the current step is valid, then advances', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: wizardSchema } });

    // Empty required field — Next must not advance to the second step.
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    expect(wrapper.text()).toContain('Username is required');
    expect(wrapper.find('textarea').exists()).toBe(false);

    // Fill a valid value, then advance.
    await wrapper.find('input[type="text"]').setValue('alice');
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('emits submit with isValid=true when the wizard is completed', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: wizardSchema } });
    await wrapper.find('input[type="text"]').setValue('alice');
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click'); // advance to last step
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click'); // finish
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(true);
  });

  it('highlights an errored step in the step indicator (per-step mode)', async () => {
    const wrapper = mount(BaseSchemaForm, { props: { schema: wizardSchema } });

    // No errors yet — nothing is highlighted.
    expect(wrapper.find('.base-form-wizard__step--error').exists()).toBe(false);

    // A failed Next leaves the first step errored, so it is highlighted.
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    const errored = wrapper.findAll('.base-form-wizard__step--error');
    expect(errored.length).toBe(1);
    expect(errored[0].text()).toContain('Account');
  });

  it("validationMode='final' lets the user jump between steps without gating", async () => {
    const wrapper = mount(BaseSchemaForm, {
      props: { schema: wizardSchema, validationMode: 'final' },
    });

    // Jump straight to the last step via the step indicator despite the first
    // step being invalid — no validation gate in final mode.
    const stepButtons = wrapper.findAll('.base-form-wizard__step-btn');
    await stepButtons[1].trigger('click');
    expect(wrapper.find('textarea').exists()).toBe(true);
    // Nothing was validated, so no step is flagged as errored yet.
    expect(wrapper.find('.base-form-wizard__step--error').exists()).toBe(false);
  });

  it("validationMode='final' validates the whole form only on finish, highlighting bad steps", async () => {
    const wrapper = mount(BaseSchemaForm, {
      props: { schema: wizardSchema, validationMode: 'final' },
    });

    // Advance to the last step and finish without filling the required field.
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');

    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect(submitEvents![0][1]).toBe(false);
    // The first step (with the unmet requirement) is now highlighted.
    const errored = wrapper.findAll('.base-form-wizard__step--error');
    expect(errored.length).toBe(1);
    expect(errored[0].text()).toContain('Account');
  });
});
