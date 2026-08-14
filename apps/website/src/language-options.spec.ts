import { describe, expect, it } from 'vitest';

import { LANGUAGE_OPTIONS } from './language-options';
import { SUPPORTED_LOCALES } from './router';

describe('website language options', () => {
  it('provides one labeled option for every supported locale', () => {
    expect(LANGUAGE_OPTIONS).toHaveLength(SUPPORTED_LOCALES.length);
    expect(new Set(LANGUAGE_OPTIONS.map((option) => option.value))).toEqual(new Set(SUPPORTED_LOCALES));
    expect(LANGUAGE_OPTIONS.every((option) => option.label.length > 0)).toBe(true);
  });
});
