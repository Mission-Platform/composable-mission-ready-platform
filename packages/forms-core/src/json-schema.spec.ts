import { describe, expect, it } from 'vitest';

import { createFormValidator, jsonSchemaDefaults, jsonSchemaToFields } from './json-schema';

import type { FormJsonSchema } from './types';

/**
 * Emulate the Cloudflare Workers runtime, which forbids runtime code
 * generation from strings (`new Function(bodyString)`) — exactly what Ajv
 * uses to compile a schema, and what crashed the service-monitor Worker at
 * SSR time with `EvalError: Code generation from strings disallowed`.
 */
function withCodegenDisallowed<T>(run: () => T): T {
  const OriginalFunction = globalThis.Function;
  const guarded = function (...arguments_: unknown[]): unknown {
    // Building a function from a source string is the disallowed codegen.
    if (arguments_.length > 0) {
      throw new EvalError('Code generation from strings disallowed for this context');
    }
    // eslint-disable-next-line unicorn/new-for-builtins
    return OriginalFunction();
  } as unknown as FunctionConstructor;
  guarded.prototype = OriginalFunction.prototype;
  globalThis.Function = guarded;
  try {
    return run();
  } finally {
    globalThis.Function = OriginalFunction;
  }
}

describe('jsonSchemaToFields (widget derivation)', () => {
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

  it('infers select / multiselect / checkbox widgets from type & enum', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        plan: { type: 'string', enum: ['free', 'pro'] },
        tags: { type: 'array' },
        agree: { type: 'boolean' },
      },
    };
    const byKey = Object.fromEntries(jsonSchemaToFields(schema).map((f) => [f.key, f.type]));
    expect(byKey.plan).toBe('select');
    expect(byKey.tags).toBe('multiselect');
    expect(byKey.agree).toBe('checkbox');
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

  it('recurses into nested field sets', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          title: 'Address',
          properties: { street: { type: 'string', title: 'Street' } },
          required: ['street'],
        },
      },
    };
    const [group] = jsonSchemaToFields(schema);
    expect(group.type).toBe('fieldset');
    expect(group.fields?.[0]).toMatchObject({ key: 'street', type: 'text', required: true });
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

describe('jsonSchemaDefaults', () => {
  it('produces type-appropriate blanks', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: {
        when: { type: 'object', ui: { widget: 'daterange' } },
        span: { type: 'object', ui: { widget: 'datetimerange' } },
        place: { type: 'object', ui: { widget: 'location', locationFormat: 'dd' } },
        n: { type: 'number', ui: { widget: 'stepper' } },
        flag: { type: 'boolean' },
        list: { type: 'array' },
        name: { type: 'string' },
      },
    };
    const defaults = jsonSchemaDefaults(schema);
    expect(defaults.when).toEqual({ start: '', end: '' });
    expect(defaults.span).toEqual({ start: '', end: '', timezone: 'browser' });
    expect(defaults.place).toEqual({ lat: undefined, lng: undefined, format: 'dd' });
    expect(defaults.n).toBeUndefined();
    expect(defaults.flag).toBe(false);
    expect(defaults.list).toEqual([]);
    expect(defaults.name).toBe('');
  });

  it('honours an explicit default keyword', () => {
    expect(jsonSchemaDefaults({ type: 'object', properties: { n: { type: 'number', default: 7 } } }).n).toBe(7);
  });
});

describe('createFormValidator', () => {
  it('reports a required string that is blank', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    });
    expect(validator.validate({ name: '' }).name).toBeTruthy();
    expect(validator.validate({ name: 'Ada' })).toEqual({});
  });

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

  it('honours an author-supplied errorMessage override verbatim', () => {
    const validator = createFormValidator({
      type: 'object',
      properties: { name: { type: 'string', title: 'Name', errorMessage: 'We need your name!' } },
      required: ['name'],
    });
    expect(validator.validate({ name: '' }).name).toBe('We need your name!');
  });

  it('routes generated messages through a translate function', () => {
    const validator = createFormValidator(
      { type: 'object', properties: { name: { type: 'string', title: 'Name' } }, required: ['name'] },
      (key, named) => `t:${key}:${(named as { label?: string }).label}`,
    );
    expect(validator.validate({ name: '' }).name).toBe('t:errors.required:Name');
  });

  describe('conditional visibility', () => {
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

  describe('deferred Ajv compilation', () => {
    const schema: FormJsonSchema = {
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
      required: ['name'],
    };

    const conditionalSchema: FormJsonSchema = {
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

    it('never compiles when codegen is disallowed but never validated (the SSR path)', () => {
      withCodegenDisallowed(() => {
        // Constructing the validator (as SSR does) must not trigger `new Function`.
        const validator = createFormValidator(schema);
        // The standards-compliant schema is produced eagerly, without codegen.
        expect(validator.jsonSchema).toMatchObject({ type: 'object', required: ['name'] });
      });
    });

    it('defers compilation to the first validate() call', () => {
      const validator = createFormValidator(schema);
      // Compilation happens only inside validate(), so it fails under the ban …
      withCodegenDisallowed(() => {
        expect(() => validator.validate({ name: '' })).toThrow(/Code generation from strings/);
      });
      // … and a normal environment compiles lazily and validates as before.
      expect(validator.validate({ name: '' }).name).toBeTruthy();
      expect(validator.validate({ name: 'Ada' })).toEqual({});
    });

    it('defers compilation for conditional schemas too', () => {
      const validator = createFormValidator(conditionalSchema);
      withCodegenDisallowed(() => {
        expect(() => validator.validate({ hasReferral: true, referralCode: '' })).toThrow(
          /Code generation from strings/,
        );
      });
      // Once codegen is allowed, per-call compilation works as expected.
      expect(validator.validate({ hasReferral: true, referralCode: '' }).referralCode).toBeTruthy();
      expect(validator.validate({ hasReferral: false, referralCode: '' })).toEqual({});
    });

    it('reuses the compiled validator across validate() calls (non-conditional schema)', () => {
      const validator = createFormValidator(schema);
      // Prime the lazily-compiled validator with a first call.
      expect(validator.validate({ name: '' }).name).toBeTruthy();
      // A second call must reuse the cached compiled function, i.e. it needs no
      // further code generation — so it still succeeds under the codegen ban.
      withCodegenDisallowed(() => {
        expect(validator.validate({ name: 'Ada' })).toEqual({});
      });
    });
  });
});
