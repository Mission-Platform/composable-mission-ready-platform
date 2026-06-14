import { DragDropProvider } from '@dnd-kit/vue';
import { describe, expect, it } from 'vitest';

import { mountWithI18n as mount } from '../../test-utils/mount-with-i18n';

import BaseFormBuilder from './base-form-builder.vue';
import {
  builderFieldToProperty,
  createField,
  fieldKeyError,
  fieldsToSchema,
  fieldsToWizardSchema,
  isFieldsetWidget,
  schemaStepConditions,
  schemaStepTitles,
  schemaToFields,
  slugify,
  uniqueKey,
  widgetHasOptions,
  widgetToJsonType,
} from './form-schema';
import { useFormBuilder } from './use-form-builder';

import type { BuilderField, FormJsonSchema, SchemaFormDefinition } from './types';

/** A schema with a nested field set (an `object` property owning `properties`). */
const nestedSchema: FormJsonSchema = {
  type: 'object',
  properties: {
    address: {
      type: 'object',
      title: 'Address',
      ui: { widget: 'fieldset' },
      properties: {
        street: { type: 'string', title: 'Street', ui: { widget: 'text' } },
        city: { type: 'string', title: 'City', ui: { widget: 'text' } },
      },
      required: ['street'],
    },
  },
};

/** Emits a `@dnd-kit/vue` provider event so we can drive the builder's handlers. */
function emitDrag(wrapper: ReturnType<typeof mount>, event: string, payload: unknown) {
  return wrapper.findComponent(DragDropProvider).vm.$emit(event, payload);
}

// ─── form-schema unit tests ──────────────────────────────────────────────────

describe('slugify', () => {
  it('produces a snake_case key from a label', () => {
    expect(slugify('First Name')).toBe('first_name');
    expect(slugify('  Hello, World!  ')).toBe('hello_world');
  });

  it('strips diacritics and falls back to "field" when empty', () => {
    expect(slugify('Prénom')).toBe('prenom');
    expect(slugify('***')).toBe('field');
  });
});

describe('uniqueKey', () => {
  it('returns the base when unused', () => {
    expect(uniqueKey('name', [])).toBe('name');
  });

  it('suffixes incrementally on collision', () => {
    expect(uniqueKey('name', ['name'])).toBe('name_2');
    expect(uniqueKey('name', ['name', 'name_2'])).toBe('name_3');
  });
});

describe('fieldKeyError', () => {
  it('accepts a non-empty key with no sibling collision', () => {
    expect(fieldKeyError('name', ['email', 'phone'])).toBeUndefined();
  });

  it('flags an empty or whitespace-only key', () => {
    expect(fieldKeyError('', [])).toBe('A key is required.');
    expect(fieldKeyError('   ', [])).toBe('A key is required.');
  });

  it('flags a key that collides with a sibling', () => {
    expect(fieldKeyError('email', ['name', 'email'])).toBe('Another field in this group already uses this key.');
  });
});

describe('widget helpers', () => {
  it('maps widgets to JSON Schema types', () => {
    expect(widgetToJsonType('text')).toBe('string');
    expect(widgetToJsonType('email')).toBe('string');
    expect(widgetToJsonType('number')).toBe('number');
    expect(widgetToJsonType('checkbox')).toBe('boolean');
    expect(widgetToJsonType('switch')).toBe('boolean');
    expect(widgetToJsonType('multiselect')).toBe('array');
    expect(widgetToJsonType('fieldset')).toBe('object');
  });

  it('flags option-based widgets', () => {
    expect(widgetHasOptions('select')).toBe(true);
    expect(widgetHasOptions('radio')).toBe(true);
    expect(widgetHasOptions('multiselect')).toBe(true);
    expect(widgetHasOptions('text')).toBe(false);
  });

  it('flags field-set widgets', () => {
    expect(isFieldsetWidget('fieldset')).toBe(true);
    expect(isFieldsetWidget('text')).toBe(false);
  });
});

describe('createField', () => {
  it('derives a unique snake_case key from the label', () => {
    const field = createField({ type: 'text', label: 'First Name', usedKeys: ['first_name'] });
    expect(field.type).toBe('text');
    expect(field.key).toBe('first_name_2');
    expect(field.required).toBe(false);
    expect(field.options).toEqual([]);
  });

  it('seeds option widgets with starter options', () => {
    const field = createField({ type: 'select' });
    expect(field.options).toHaveLength(2);
  });

  it('gives field sets an empty children array', () => {
    const field = createField({ type: 'fieldset' });
    expect(field.children).toEqual([]);
  });
});

// ─── builder field → schema property ──────────────────────────────────────────

describe('builderFieldToProperty', () => {
  it('pins the widget and maps validation keywords', () => {
    const field = createField({ type: 'text', label: 'Name', key: 'name' });
    field.minLength = 2;
    field.placeholder = 'Jane';
    const property = builderFieldToProperty(field);
    expect(property.type).toBe('string');
    expect(property.title).toBe('Name');
    expect(property.minLength).toBe(2);
    expect(property.ui).toMatchObject({ widget: 'text', placeholder: 'Jane' });
  });

  it('serialises options as oneOf', () => {
    const field = createField({ type: 'select', key: 'topic' });
    field.options = [
      { label: 'Sales', value: 'sales' },
      { label: 'Support', value: 'support' },
    ];
    const property = builderFieldToProperty(field);
    expect(property.oneOf).toEqual([
      { const: 'sales', title: 'Sales' },
      { const: 'support', title: 'Support' },
    ]);
  });

  it('nests a field set as an object property', () => {
    const fieldset = createField({ type: 'fieldset', label: 'Address', key: 'address' });
    const child = createField({ type: 'text', label: 'Street', key: 'street' });
    child.required = true;
    fieldset.children = [child];
    const property = builderFieldToProperty(fieldset);
    expect(property.type).toBe('object');
    expect(property.properties?.street?.title).toBe('Street');
    expect(property.required).toEqual(['street']);
  });
});

// ─── fields → schema definition ───────────────────────────────────────────────

describe('fieldsToSchema', () => {
  it('builds an object schema with ordered properties and required keys', () => {
    const name = createField({ type: 'text', label: 'Name', key: 'name' });
    name.required = true;
    const email = createField({ type: 'email', label: 'Email', key: 'email' });
    const schema = fieldsToSchema([name, email], { title: 'Contact' });
    expect(schema.title).toBe('Contact');
    expect(Object.keys(schema.properties)).toEqual(['name', 'email']);
    expect(schema.required).toEqual(['name']);
  });
});

describe('fieldsToWizardSchema', () => {
  it('keeps each step fields and preserves step titles', () => {
    const a = createField({ type: 'text', key: 'a' });
    const b = createField({ type: 'text', key: 'b' });
    const steps = fieldsToWizardSchema([[a], [b]], { stepTitles: ['One', 'Two'] });
    expect(steps).toHaveLength(2);
    expect(steps[0].title).toBe('One');
    expect(Object.keys(steps[0].properties)).toEqual(['a']);
    expect(Object.keys(steps[1].properties)).toEqual(['b']);
  });

  it('honours an explicit step count, keeping empty steps', () => {
    const a = createField({ type: 'text', key: 'a' });
    const steps = fieldsToWizardSchema([[a]], { stepCount: 3 });
    expect(steps).toHaveLength(3);
    expect(Object.keys(steps[2].properties)).toEqual([]);
  });
});

// ─── schema → builder fields (round trip) ──────────────────────────────────────

describe('schemaToFields', () => {
  it('hydrates a nested field set', () => {
    const fields = schemaToFields(nestedSchema) as BuilderField[];
    expect(fields).toHaveLength(1);
    const [address] = fields;
    expect(address.type).toBe('fieldset');
    expect(address.children).toHaveLength(2);
    expect(address.children?.[0].key).toBe('street');
    expect(address.children?.[0].required).toBe(true);
  });

  it('hydrates a wizard definition into a per-step matrix', () => {
    const wizard: SchemaFormDefinition = [
      { type: 'object', properties: { a: { type: 'string', ui: { widget: 'text' } } } },
      { type: 'object', properties: { b: { type: 'string', ui: { widget: 'text' } } } },
    ];
    const fields = schemaToFields(wizard) as BuilderField[][];
    expect(fields).toHaveLength(2);
    expect(fields[0].map((field) => field.key)).toEqual(['a']);
    expect(fields[1].map((field) => field.key)).toEqual(['b']);
  });

  it('round-trips a nested schema back to an equivalent definition', () => {
    const fields = schemaToFields(nestedSchema) as BuilderField[];
    const rebuilt = fieldsToSchema(fields);
    expect(rebuilt.properties.address?.properties?.street?.title).toBe('Street');
    expect(rebuilt.properties.address?.required).toEqual(['street']);
  });

  it('reads wizard step metadata', () => {
    const wizard: SchemaFormDefinition = [
      { type: 'object', title: 'One', properties: {}, visibleWhen: { allOf: [{ field: 'x', equals: 'y' }] } },
      { type: 'object', title: 'Two', properties: {} },
    ];
    expect(schemaStepTitles(wizard)).toEqual(['One', 'Two']);
    expect(schemaStepConditions(wizard)[0]).toEqual({ allOf: [{ field: 'x', equals: 'y' }] });
  });
});

// ─── useFormBuilder ────────────────────────────────────────────────────────────

function makeBuilder(wizard = false) {
  return useFormBuilder({ wizard: () => wizard, title: () => '', description: () => '' });
}

/** Narrows the builder's working fields to the flat single-step list. */
function flatFields(builder: ReturnType<typeof useFormBuilder>): BuilderField[] {
  return builder.fields.value as BuilderField[];
}

describe('useFormBuilder', () => {
  it('adds, selects, updates, and removes fields', () => {
    const builder = makeBuilder();
    const id = builder.addField('text');
    expect(builder.fields.value).toHaveLength(1);
    expect(builder.selectedId.value).toBe(id);

    builder.updateField(id, { label: 'Renamed', required: true });
    expect(flatFields(builder)[0].label).toBe('Renamed');
    expect(flatFields(builder)[0].required).toBe(true);

    builder.removeField(id);
    expect(builder.fields.value).toHaveLength(0);
    expect(builder.selectedId.value).toBeUndefined();
  });

  it('coerces type-dependent state on a type change', () => {
    const builder = makeBuilder();
    const id = builder.addField('text');
    builder.updateField(id, { type: 'fieldset' });
    expect(flatFields(builder)[0].children).toEqual([]);
    builder.updateField(id, { type: 'select' });
    expect(flatFields(builder)[0].children).toBeUndefined();
    expect(flatFields(builder)[0].options).toHaveLength(2);
  });

  it('duplicates a field with a fresh id and key right after the original', () => {
    const builder = makeBuilder();
    const id = builder.addField('text', { index: 0 });
    builder.duplicateField(id);
    expect(builder.fields.value).toHaveLength(2);
    expect(flatFields(builder)[1].id).not.toBe(id);
    expect(flatFields(builder)[1].key).not.toBe(flatFields(builder)[0].key);
  });

  it('reorders fields within their container', () => {
    const builder = makeBuilder();
    const first = builder.addField('text');
    const second = builder.addField('email');
    builder.moveUp(second);
    expect(flatFields(builder).map((field) => field.id)).toEqual([second, first]);
  });

  it('only reorders among same-step siblings in wizard mode', () => {
    const builder = makeBuilder(true);
    builder.addStep();
    const a = builder.insertField('text', { step: 0 });
    const b = builder.insertField('text', { step: 1 });
    // Moving the step-1 field up must not jump it above the step-0 field.
    builder.moveUp(b);
    const steps = builder.fields.value as BuilderField[][];
    expect(steps[0].map((field) => field.id)).toEqual([a]);
    expect(steps[1].map((field) => field.id)).toEqual([b]);
  });

  it('moves a field between steps without storing the step on the field', () => {
    const builder = makeBuilder(true);
    builder.addStep();
    const a = builder.insertField('text', { step: 0 });
    expect(builder.selectedStep.value).toBe(0);
    builder.moveFieldToStep(a, 1);
    const steps = builder.fields.value as BuilderField[][];
    expect(steps[0]).toHaveLength(0);
    expect(steps[1].map((field) => field.id)).toEqual([a]);
    expect(builder.selectedStep.value).toBe(1);
  });

  it('nests an existing field into a field set and back out', () => {
    const builder = makeBuilder();
    const fieldsetId = builder.addField('fieldset');
    const fieldId = builder.addField('text');
    builder.moveField(fieldId, { parentId: fieldsetId, index: 0 });
    expect(builder.fields.value).toHaveLength(1);
    expect(flatFields(builder)[0].children).toHaveLength(1);

    builder.moveField(fieldId, { index: 1 });
    expect(builder.fields.value).toHaveLength(2);
    expect(flatFields(builder)[0].children).toHaveLength(0);
  });

  it('refuses to nest a field set into itself', () => {
    const builder = makeBuilder();
    const fieldsetId = builder.addField('fieldset');
    builder.moveField(fieldsetId, { parentId: fieldsetId, index: 0 });
    expect(builder.fields.value).toHaveLength(1);
    expect(flatFields(builder)[0].children).toHaveLength(0);
  });

  it('exposes a definition that switches to a wizard array', () => {
    const builder = makeBuilder(true);
    builder.addStep();
    builder.insertField('text', { step: 0 });
    builder.insertField('text', { step: 1 });
    expect(Array.isArray(builder.definition.value)).toBe(true);
    expect(builder.definition.value).toHaveLength(2);
  });

  it('adds child fields to a field set', () => {
    const builder = makeBuilder();
    const fieldsetId = builder.addField('fieldset');
    builder.addChild(fieldsetId);
    expect(flatFields(builder)[0].children).toHaveLength(1);
  });
});

// ─── BaseFormBuilder component ──────────────────────────────────────────────────

describe('BaseFormBuilder', () => {
  it('renders the palette and the empty-canvas hint', () => {
    const wrapper = mount(BaseFormBuilder);
    expect(wrapper.text()).toContain('Fields');
    expect(wrapper.text()).toContain('Drag a field here from the palette');
  });

  it('adds a field when a palette entry is clicked', async () => {
    const wrapper = mount(BaseFormBuilder);
    await wrapper.find('.form-builder-palette-item').trigger('click');
    expect(wrapper.findAll('.form-builder-field')).toHaveLength(1);
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
  });

  it('adds a field when a palette item is dropped on the canvas', async () => {
    const wrapper = mount(BaseFormBuilder);
    emitDrag(wrapper, 'dragEnd', {
      canceled: false,
      operation: {
        source: { data: { kind: 'palette', fieldType: 'text' } },
        target: { data: { kind: 'canvas' } },
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.form-builder-field')).toHaveLength(1);
  });

  it('hydrates from a nested schema passed via v-model', () => {
    const wrapper = mount(BaseFormBuilder, { props: { modelValue: nestedSchema } });
    expect(wrapper.text()).toContain('Address');
    // The nested child row renders inside the field set.
    expect(wrapper.findAll('.form-builder-field').length).toBeGreaterThanOrEqual(2);
  });

  it('ignores drops while disabled', async () => {
    const wrapper = mount(BaseFormBuilder, { props: { disabled: true } });
    emitDrag(wrapper, 'dragEnd', {
      canceled: false,
      operation: {
        source: { data: { kind: 'palette', fieldType: 'text' } },
        target: { data: { kind: 'canvas' } },
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.form-builder-field')).toHaveLength(0);
  });
});
