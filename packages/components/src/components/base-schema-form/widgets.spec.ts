import { describe, expect, it } from 'vitest';

import { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from './json-schema';

import type { FormJsonSchema } from './types';

// ─── new widget derivation ───────────────────────────────────────────────────

describe('jsonSchemaToFields (new widgets)', () => {
  it('derives numeric metadata for stepper / number fields', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        qty: {
          type: 'integer',
          title: 'Quantity',
          minimum: 0,
          maximum: 10,
          ui: { widget: 'stepper', integer: true, unsigned: true, step: 2 },
        },
        price: { type: 'number', ui: { precision: 2 } },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f]));
    expect(byKey.qty.type).toBe('stepper');
    expect(byKey.qty.integer).toBe(true);
    expect(byKey.qty.unsigned).toBe(true);
    expect(byKey.qty.step).toBe(2);
    expect(byKey.qty.min).toBe(0);
    expect(byKey.qty.max).toBe(10);
    expect(byKey.price.type).toBe('number');
    expect(byKey.price.precision).toBe(2);
  });

  it('infers date / time / datetime widgets from format', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        d: { type: 'string', format: 'date' },
        t: { type: 'string', format: 'time' },
        dt: { type: 'string', format: 'date-time' },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f.type]));
    expect(byKey.d).toBe('date');
    expect(byKey.t).toBe('time');
    expect(byKey.dt).toBe('datetime');
  });

  it('derives range and location widgets with metadata', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        when: { type: 'object', ui: { widget: 'daterange' } },
        slot: { type: 'object', ui: { widget: 'timerange', showSeconds: true } },
        place: { type: 'object', ui: { widget: 'location', locationFormat: 'dms' } },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f]));
    expect(byKey.when.type).toBe('daterange');
    expect(byKey.slot.type).toBe('timerange');
    expect(byKey.slot.showSeconds).toBe(true);
    expect(byKey.place.type).toBe('location');
    expect(byKey.place.locationFormat).toBe('dms');
  });

  it('carries ui.visibleWhen onto the field', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        extra: { type: 'string', ui: { visibleWhen: { field: 'plan', equals: 'pro' } } },
      },
    };
    expect(jsonSchemaToFields(schema)[0].visibleWhen).toEqual({ field: 'plan', equals: 'pro' });
  });
});

describe('jsonSchemaDefaults (new widgets)', () => {
  it('produces type-appropriate blanks', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        when: { type: 'object', ui: { widget: 'daterange' } },
        span: { type: 'object', ui: { widget: 'datetimerange' } },
        place: { type: 'object', ui: { widget: 'location', locationFormat: 'dd' } },
        n: { type: 'number', ui: { widget: 'stepper' } },
      },
    };
    const defaults = jsonSchemaDefaults(schema);
    expect(defaults.when).toEqual({ start: '', end: '' });
    expect(defaults.span).toEqual({ start: '', end: '', timezone: 'browser' });
    expect(defaults.place).toEqual({ lat: undefined, lng: undefined, format: 'dd' });
    expect(defaults.n).toBeUndefined();
  });
});

// ─── numeric validation ──────────────────────────────────────────────────────

describe('createFormValidator (numeric)', () => {
  it('enforces integer and unsigned constraints', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { qty: { type: 'integer', ui: { widget: 'stepper', integer: true, unsigned: true } } },
    });
    expect(validator.validate({ qty: 5 })).toEqual({});
    expect(validator.validate({ qty: -3 }).qty).toBeTruthy();
    expect(validator.validate({ qty: 2.5 }).qty).toBeTruthy();
  });

  it('requires a composite range only when present-and-required', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { when: { type: 'object', title: 'When', ui: { widget: 'daterange' } } },
      required: ['when'],
    });
    // empty composite → treated as missing → required error on the field key
    expect(validator.validate({ when: { start: '', end: '' } }).when).toBeTruthy();
    // filled composite passes
    expect(validator.validate({ when: { start: '2020-01-01', end: '2020-01-02' } })).toEqual({});
  });
});

// ─── conditional fields ──────────────────────────────────────────────────────

describe('createFormValidator (conditional visibility)', () => {
  const schema: FormJsonSchema = {
    type: 'object',
    properties: {
      hasReferral: { type: 'boolean', title: 'Has referral' },
      referralCode: {
        type: 'string',
        title: 'Referral code',
        ui: { visibleWhen: { field: 'hasReferral', equals: true } },
      },
    },
    required: ['referralCode'],
  };

  it('skips a hidden required field', () => {
    expect(createFormValidator(schema).validate({ hasReferral: false, referralCode: '' })).toEqual({});
  });

  it('enforces the field once its condition holds', () => {
    const errors = createFormValidator(schema).validate({ hasReferral: true, referralCode: '' });
    expect(errors.referralCode).toBeTruthy();
  });
});
