import { describe, expect, it } from 'vitest';

import { evaluateCondition, isFieldVisible } from './conditions';

import type { FieldCondition } from './types';

describe('evaluateCondition (leaves)', () => {
  it('equals / notEquals', () => {
    expect(evaluateCondition({ field: 'plan', equals: 'pro' }, { plan: 'pro' })).toBe(true);
    expect(evaluateCondition({ field: 'plan', equals: 'pro' }, { plan: 'free' })).toBe(false);
    expect(evaluateCondition({ field: 'plan', notEquals: 'free' }, { plan: 'pro' })).toBe(true);
  });

  it('in / contains', () => {
    expect(evaluateCondition({ field: 'role', in: ['a', 'b'] }, { role: 'b' })).toBe(true);
    expect(evaluateCondition({ field: 'role', in: ['a', 'b'] }, { role: 'c' })).toBe(false);
    expect(evaluateCondition({ field: 'tags', contains: 'x' }, { tags: ['x', 'y'] })).toBe(true);
    expect(evaluateCondition({ field: 'tags', contains: 'z' }, { tags: ['x', 'y'] })).toBe(false);
  });

  it('numeric comparators', () => {
    expect(evaluateCondition({ field: 'age', gte: 18 }, { age: 18 })).toBe(true);
    expect(evaluateCondition({ field: 'age', gt: 18 }, { age: 18 })).toBe(false);
    expect(evaluateCondition({ field: 'age', lt: 65 }, { age: 70 })).toBe(false);
    // strings coerce to numbers
    expect(evaluateCondition({ field: 'age', gte: 18 }, { age: '21' })).toBe(true);
    // non-numeric fails the numeric comparator
    expect(evaluateCondition({ field: 'age', gte: 18 }, { age: 'x' })).toBe(false);
  });

  it('truthy', () => {
    expect(evaluateCondition({ field: 'nick', truthy: true }, { nick: 'a' })).toBe(true);
    expect(evaluateCondition({ field: 'nick', truthy: true }, { nick: '' })).toBe(false);
    expect(evaluateCondition({ field: 'nick', truthy: false }, { nick: '' })).toBe(true);
    expect(evaluateCondition({ field: 'list', truthy: true }, { list: [] })).toBe(false);
  });
});

describe('evaluateCondition (combinators)', () => {
  const values = { a: 1, b: 2, c: 3 };

  it('allOf is AND', () => {
    const condition: FieldCondition = {
      allOf: [
        { field: 'a', equals: 1 },
        { field: 'b', equals: 2 },
      ],
    };
    expect(evaluateCondition(condition, values)).toBe(true);
    expect(
      evaluateCondition(
        {
          allOf: [
            { field: 'a', equals: 1 },
            { field: 'b', equals: 9 },
          ],
        },
        values,
      ),
    ).toBe(false);
  });

  it('anyOf is OR', () => {
    const condition: FieldCondition = {
      anyOf: [
        { field: 'a', equals: 9 },
        { field: 'b', equals: 2 },
      ],
    };
    expect(evaluateCondition(condition, values)).toBe(true);
    expect(
      evaluateCondition(
        {
          anyOf: [
            { field: 'a', equals: 9 },
            { field: 'b', equals: 9 },
          ],
        },
        values,
      ),
    ).toBe(false);
  });

  it('oneOf is exactly-one (XOR)', () => {
    expect(
      evaluateCondition(
        {
          oneOf: [
            { field: 'a', equals: 1 },
            { field: 'b', equals: 9 },
          ],
        },
        values,
      ),
    ).toBe(true);
    // both pass → fails
    expect(
      evaluateCondition(
        {
          oneOf: [
            { field: 'a', equals: 1 },
            { field: 'b', equals: 2 },
          ],
        },
        values,
      ),
    ).toBe(false);
    // none pass → fails
    expect(
      evaluateCondition(
        {
          oneOf: [
            { field: 'a', equals: 9 },
            { field: 'b', equals: 9 },
          ],
        },
        values,
      ),
    ).toBe(false);
  });

  it('nests combinators', () => {
    const condition: FieldCondition = {
      allOf: [
        { field: 'a', equals: 1 },
        {
          anyOf: [
            { field: 'b', equals: 9 },
            { field: 'c', equals: 3 },
          ],
        },
      ],
    };
    expect(evaluateCondition(condition, values)).toBe(true);
  });

  it('reads dotted (nested field-set) paths', () => {
    expect(evaluateCondition({ field: 'address.country', equals: 'US' }, { address: { country: 'US' } })).toBe(true);
  });
});

describe('isFieldVisible', () => {
  it('is always visible without a condition', () => {
    expect(isFieldVisible({}, {})).toBe(true);
  });

  it('honours the field condition', () => {
    const field = { visibleWhen: { field: 'plan', equals: 'pro' } as FieldCondition };
    expect(isFieldVisible(field, { plan: 'pro' })).toBe(true);
    expect(isFieldVisible(field, { plan: 'free' })).toBe(false);
  });
});
