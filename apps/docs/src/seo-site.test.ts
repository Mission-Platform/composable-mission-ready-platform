import { describe, expect, it } from 'vitest';

import { alternatesForSlug, canonicalForSlug, LOCALE_BCP47, searchCanonical } from './seo-site';

describe('documentation SEO URLs', () => {
  it('creates locale-aware canonical document URLs', () => {
    expect(canonicalForSlug('overview')).toBe('https://docs.mission-platform.dev/');
    expect(canonicalForSlug('overview', 'he')).toBe('https://docs.mission-platform.dev/he/overview');
  });

  it('creates a complete hreflang set for translated documents', () => {
    const alternates = alternatesForSlug('testing');
    expect(alternates).toHaveLength(12);
    expect(alternates.find((entry) => entry.hreflang === LOCALE_BCP47.ar)?.href).toContain('/ar/testing');
    expect(alternates.at(-1)?.hreflang).toBe('x-default');
  });

  it('uses locale-prefixed search URLs', () => {
    expect(searchCanonical('en')).toBe('https://docs.mission-platform.dev/search');
    expect(searchCanonical('ja')).toBe('https://docs.mission-platform.dev/ja/search');
  });
});
