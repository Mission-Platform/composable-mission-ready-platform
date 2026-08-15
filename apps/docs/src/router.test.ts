import { describe, expect, it } from 'vitest';

import { documentPath } from './documentation';
import { resolveDocumentationLocale } from './i18n';
import { routes } from './router';

describe('localized documentation routes', () => {
  it('keeps English URLs unprefixed and prefixes translated documents', () => {
    expect(documentPath('overview')).toBe('/overview');
    expect(documentPath('configs/index', 'fr')).toBe('/fr/configs/index');
  });

  it('restricts locale resolution to supported locale segments', () => {
    expect(resolveDocumentationLocale('ar')).toBe('ar');
    expect(resolveDocumentationLocale('configs')).toBe('en');
  });

  it('declares locale-aware search and catch-all records before English catch-all', () => {
    const names = routes.map((route) => route.name);
    expect(names).toContain('localized-search');
    expect(names).toContain('localized-doc');
    expect(names.indexOf('localized-doc')).toBeLessThan(names.indexOf('doc'));
  });
});
