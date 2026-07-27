import { describe, expect, it } from 'vitest';

import { i18nPlugin } from '.';

describe('i18nPlugin', () => {
  it('resolves virtual modules', () => {
    const plugin = i18nPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;

    expect(resolveId('virtual:i18n-resources')).toBe('\0virtual:i18n-resources');
    expect(resolveId('virtual:i18n-locale-en')).toBe('\0virtual:i18n-locale-en');
    expect(resolveId('other-module')).toBeUndefined();
  });
});
