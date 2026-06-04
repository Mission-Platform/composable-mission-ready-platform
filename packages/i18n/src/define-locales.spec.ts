import { describe, expect, it } from 'vitest';

import { defineLocales } from './define-locales';

import type { MpLocaleModule } from './types';

describe('defineLocales', () => {
  it('returns the same object reference', () => {
    const module = { en: { hello: 'Hello' } };
    expect(defineLocales(module)).toBe(module);
  });

  it('preserves all locale keys and message values', () => {
    const module: MpLocaleModule = {
      en: { required: 'required', close: 'Close' },
      fr: { required: 'requis', close: 'Fermer' },
    };
    expect(defineLocales(module)).toEqual(module);
  });

  it('accepts an empty module', () => {
    expect(defineLocales({})).toEqual({});
  });
});
