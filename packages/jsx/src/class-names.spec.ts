import { describe, expect, it } from 'vitest';

import { classNames } from './runtime';

describe('classNames', () => {
  it('joins a space-separated string and individual string arguments', () => {
    expect(classNames('a b', 'c')).toBe('a b c');
  });

  it('keeps only the truthy keys of an object map', () => {
    expect(classNames({ a: true, b: false, c: undefined, e: true })).toBe('a e');
  });

  it('flattens (possibly nested) arrays and drops falsy members', () => {
    expect(classNames(['a', false, ['b', undefined], 0 && 'c', 'd'])).toBe('a b d');
  });

  it('combines the string, object, and array forms in one call', () => {
    expect(classNames('base', ['mod-a', { 'mod-b': true, 'mod-c': false }], { active: true })).toBe(
      'base mod-a mod-b active',
    );
  });

  it('de-duplicates repeated class names, keeping the first occurrence', () => {
    expect(classNames('a b', 'a', { b: true, c: true })).toBe('a b c');
  });

  it('returns an empty string when nothing is active', () => {
    expect(classNames(undefined, false, '', { a: false }, [])).toBe('');
  });
});
