import { describe, expect, it } from 'vitest';

import { normalizeComponentName, normalizeFileName } from './names';

describe('Forge name normalization', () => {
  it('creates deterministic source and file identifiers from layer names', () => {
    expect(normalizeComponentName('Primary CTA / Button')).toBe('PrimaryCtaButton');
    expect(normalizeFileName('Primary CTA / Button')).toBe('primary-cta-button');
  });

  it('handles empty, numeric, and unicode names safely', () => {
    expect(normalizeComponentName('')).toBe('GeneratedComponent');
    expect(normalizeComponentName('123 card')).toBe('Component123Card');
    expect(normalizeFileName('')).toBe('generated-component');
    expect(normalizeComponentName('Über Café')).toBe('ÜberCafé');
  });
});
