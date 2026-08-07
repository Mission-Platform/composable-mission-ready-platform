import { describe, expect, it } from 'vitest';

import { canonicalFor, LOCALE_DIR, resolveLocale, SITE_NAME, SITE_ORIGIN } from './seo-site';

describe('@mission-platform/website', () => {
  it('exposes a stable site identity and locale-aware canonical URLs', () => {
    expect(SITE_NAME).toBe('Mission Platform');
    expect(SITE_ORIGIN).toBe('https://mission-platform.dev');
    expect(canonicalFor('en')).toBe(`${SITE_ORIGIN}/`);
    expect(canonicalFor('fr')).toBe(`${SITE_ORIGIN}/fr/`);
    expect(LOCALE_DIR.ar).toBe('rtl');
  });

  it('falls back to the default locale for unsupported route parameters', () => {
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('unsupported')).toBe('en');
    expect(resolveLocale('')).toBe('en');
  });
});
