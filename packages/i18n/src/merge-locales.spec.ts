import { describe, expect, it } from 'vitest';

import { deepMergeLocales, deepMergeMessages, mergeLocales } from './merge-locales';

describe('mergeLocales', () => {
  it('returns an empty object when given an empty array', () => {
    expect(mergeLocales([])).toEqual({});
  });

  it('returns the single module unchanged when given one module', () => {
    const module = { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } };
    expect(mergeLocales([module])).toEqual(module);
  });

  it('merges two modules with disjoint locales', () => {
    const a = { en: { hello: 'Hello' } };
    const b = { fr: { hello: 'Bonjour' } };
    expect(mergeLocales([a, b])).toEqual({
      en: { hello: 'Hello' },
      fr: { hello: 'Bonjour' },
    });
  });

  it('merges two modules with overlapping locales — later wins', () => {
    const a = { en: { close: 'Close', search: 'Search' } };
    const b = { en: { close: 'Dismiss' } };
    expect(mergeLocales([a, b])).toEqual({
      en: { close: 'Dismiss', search: 'Search' },
    });
  });

  it('merges three modules in order — rightmost wins for each key', () => {
    const a = { en: { a: '1', b: '1' } };
    const b = { en: { b: '2', c: '2' } };
    const c = { en: { c: '3' } };
    expect(mergeLocales([a, b, c])).toEqual({
      en: { a: '1', b: '2', c: '3' },
    });
  });

  it('does not mutate the input modules', () => {
    const a = { en: { hello: 'Hello' } };
    const b = { en: { hello: 'Hi' } };
    mergeLocales([a, b]);
    expect(a.en.hello).toBe('Hello');
  });

  it('handles multiple locales across multiple modules', () => {
    const base = { en: { required: 'required', loading: 'Loading…' } };
    const components = {
      en: { close: 'Close' },
      fr: { required: 'requis', loading: 'Chargement…', close: 'Fermer' },
    };
    const overrides = { fr: { close: 'Quitter' } };

    expect(mergeLocales([base, components, overrides])).toEqual({
      en: { required: 'required', loading: 'Loading…', close: 'Close' },
      fr: { required: 'requis', loading: 'Chargement…', close: 'Quitter' },
    });
  });
});

describe('deepMergeMessages', () => {
  it('merges nested objects key-by-key', () => {
    const target = { nav: { notes: 'Notes', snippets: 'Snippets' }, theme: 'Theme' };
    const source = { nav: { notes: 'Renamed' } };
    expect(deepMergeMessages(target, source)).toEqual({
      nav: { notes: 'Renamed', snippets: 'Snippets' },
      theme: 'Theme',
    });
  });

  it('replaces arrays wholesale rather than merging them', () => {
    const target = { items: [{ title: 'A' }, { title: 'B' }] };
    const source = { items: [{ title: 'C' }] };
    expect(deepMergeMessages(target, source)).toEqual({ items: [{ title: 'C' }] });
  });

  it('does not mutate the inputs', () => {
    const target = { nav: { notes: 'Notes' } };
    const source = { nav: { notes: 'Renamed' } };
    deepMergeMessages(target, source);
    expect(target.nav.notes).toBe('Notes');
  });
});

describe('deepMergeLocales', () => {
  it('deep-merges each locale independently', () => {
    const target = { en: { breakpoint: 'breakpoint:', separator: '|' }, fr: { breakpoint: 'point:' } };
    const source = { en: { breakpoint: 'Viewport:' } };
    expect(deepMergeLocales(target, source)).toEqual({
      en: { breakpoint: 'Viewport:', separator: '|' },
      fr: { breakpoint: 'point:' },
    });
  });

  it('adds locales present only in the source', () => {
    const target = { en: { breakpoint: 'breakpoint:' } };
    const source = { fr: { breakpoint: 'point de rupture :' } };
    expect(deepMergeLocales(target, source)).toEqual({
      en: { breakpoint: 'breakpoint:' },
      fr: { breakpoint: 'point de rupture :' },
    });
  });
});
