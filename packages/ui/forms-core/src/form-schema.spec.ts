import { describe, expect, it } from 'vitest';

import {
  builderFieldToProperty,
  createField,
  DEFAULT_FIELD_TYPES,
  fieldKeyError,
  fieldsToDefinition,
  fieldsToSchema,
  isDateWidget,
  isFileWidget,
  isLocationWidget,
  isMultilineWidget,
  isTextWidget,
  isTimeWidget,
  schemaToFields,
  slugify,
  uniqueKey,
  widgetToJsonType,
} from './form-schema';

import type { BuilderField } from './builder-types';
import type { FormFieldType, FormJsonSchema } from './types';

describe('naming helpers', () => {
  it('slugifies a label to a safe snake_case key', () => {
    expect(slugify('First name!')).toBe('first_name');
    expect(slugify('  Crème brûlée  ')).toBe('creme_brulee');
    expect(slugify('   ')).toBe('field');
  });

  it('de-duplicates a key against its siblings', () => {
    expect(uniqueKey('name', [])).toBe('name');
    expect(uniqueKey('name', ['name'])).toBe('name_2');
    expect(uniqueKey('name', ['name', 'name_2'])).toBe('name_3');
  });

  it('validates a field key against its siblings', () => {
    expect(fieldKeyError('', [])).toBeTruthy();
    expect(fieldKeyError('email', ['email'])).toBeTruthy();
    expect(fieldKeyError('email', ['name'])).toBeUndefined();
  });
});

describe('widget classification', () => {
  it('maps widgets onto their JSON Schema primitive type', () => {
    expect(widgetToJsonType('number')).toBe('number');
    expect(widgetToJsonType('checkbox')).toBe('boolean');
    expect(widgetToJsonType('multiselect')).toBe('array');
    expect(widgetToJsonType('fieldset')).toBe('object');
    expect(widgetToJsonType('text')).toBe('string');
  });

  it('classifies widgets for their inspector editors', () => {
    expect(isTextWidget('email')).toBe(true);
    expect(isTextWidget('number')).toBe(false);
    expect(isMultilineWidget('markdown')).toBe(true);
    expect(isMultilineWidget('text')).toBe(false);
    expect(isDateWidget('datetimerange')).toBe(true);
    expect(isDateWidget('time')).toBe(false);
    expect(isTimeWidget('time')).toBe(true);
    expect(isTimeWidget('date')).toBe(false);
    expect(isFileWidget('file')).toBe(true);
    expect(isLocationWidget('location')).toBe(true);
  });
});

describe('createField', () => {
  it('creates a field with a derived, de-duplicated key', () => {
    const field = createField({ type: 'text', label: 'Email address', usedKeys: ['email_address'] });
    expect(field.type).toBe('text');
    expect(field.key).toBe('email_address_2');
    expect(field.required).toBe(false);
  });

  it('seeds option widgets with starter options and field sets with children', () => {
    expect(createField({ type: 'select' }).options).toHaveLength(2);
    expect(createField({ type: 'fieldset' }).children).toEqual([]);
    expect(createField({ type: 'text' }).options).toEqual([]);
  });

  it('exposes a palette covering every form field type (all inputs + fieldset)', () => {
    // The palette must offer every control the schema-driven form can render —
    // all text/number/choice/boolean/date-time inputs, plus the grouping field
    // set — so the builder can author any form.
    const everyFieldType: FormFieldType[] = [
      'text',
      'email',
      'password',
      'number',
      'stepper',
      'url',
      'tel',
      'textarea',
      'markdown',
      'checkbox',
      'switch',
      'select',
      'radio',
      'multiselect',
      'date',
      'time',
      'datetime',
      'daterange',
      'timerange',
      'datetimerange',
      'location',
      'file',
      'fieldset',
    ];
    const palette = DEFAULT_FIELD_TYPES.map((entry) => entry.type);
    for (const type of everyFieldType) expect(palette).toContain(type);
    // No duplicate entries.
    expect(new Set(palette).size).toBe(palette.length);
  });

  it('round-trips the new inputs through their `ui.widget`', () => {
    for (const type of ['stepper', 'markdown', 'time', 'daterange', 'datetimerange', 'tel'] as FormFieldType[]) {
      const field = createField({ type, label: type });
      const property = builderFieldToProperty(field);
      expect(property.ui?.widget).toBe(type);
    }
  });
});

describe('builderFieldToProperty', () => {
  it('serialises a required text field with constraints + ui', () => {
    const field: BuilderField = {
      id: 'f1',
      key: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      options: [],
      minLength: 2,
      placeholder: 'Your name',
    };
    const property = builderFieldToProperty(field);
    expect(property).toMatchObject({ type: 'string', title: 'Name', minLength: 2 });
    expect(property.ui).toMatchObject({ widget: 'text', placeholder: 'Your name' });
  });

  it('serialises an option widget to a oneOf list', () => {
    const field: BuilderField = {
      id: 'f2',
      key: 'plan',
      type: 'select',
      label: 'Plan',
      required: false,
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
    };
    expect(builderFieldToProperty(field).oneOf).toEqual([
      { const: 'free', title: 'Free' },
      { const: 'pro', title: 'Pro' },
    ]);
  });
});

describe('fields ⇄ schema round trip', () => {
  it('builds a single-step schema and hydrates it back', () => {
    const fields: BuilderField[] = [
      { id: 'f1', key: 'name', type: 'text', label: 'Name', required: true, options: [] },
      {
        id: 'f2',
        key: 'plan',
        type: 'select',
        label: 'Plan',
        required: false,
        options: [{ label: 'Pro', value: 'pro' }],
      },
    ];
    const schema = fieldsToSchema(fields, { title: 'Signup' }) as FormJsonSchema;
    expect(schema.title).toBe('Signup');
    expect(Object.keys(schema.properties)).toEqual(['name', 'plan']);
    expect(schema.required).toEqual(['name']);

    const hydrated = schemaToFields(schema) as BuilderField[];
    expect(hydrated.map((f) => f.key)).toEqual(['name', 'plan']);
    expect(hydrated[0].required).toBe(true);
    expect(hydrated[1].type).toBe('select');
    expect(hydrated[1].options).toEqual([{ label: 'Pro', value: 'pro' }]);
  });

  it('builds a multi-step wizard definition', () => {
    const steps: BuilderField[][] = [
      [{ id: 'a', key: 'name', type: 'text', label: 'Name', required: true, options: [] }],
      [{ id: 'b', key: 'agree', type: 'checkbox', label: 'Agree', required: true, options: [] }],
    ];
    const definition = fieldsToDefinition(steps, { wizard: true, stepTitles: ['Profile', 'Terms'] });
    expect(Array.isArray(definition)).toBe(true);
    const wizard = definition as FormJsonSchema[];
    expect(wizard).toHaveLength(2);
    expect(wizard[0].title).toBe('Profile');
    expect(Object.keys(wizard[1].properties)).toEqual(['agree']);
  });

  it('round-trips a nested field set', () => {
    const fields: BuilderField[] = [
      {
        id: 'g',
        key: 'address',
        type: 'fieldset',
        label: 'Address',
        required: false,
        options: [],
        children: [{ id: 's', key: 'street', type: 'text', label: 'Street', required: true, options: [] }],
      },
    ];
    const schema = fieldsToSchema(fields) as FormJsonSchema;
    expect(schema.properties.address.properties?.street).toMatchObject({ type: 'string' });

    const hydrated = schemaToFields(schema) as BuilderField[];
    expect(hydrated[0].type).toBe('fieldset');
    expect(hydrated[0].children?.[0]).toMatchObject({ key: 'street', required: true });
  });
});
