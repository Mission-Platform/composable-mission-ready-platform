import { describe, expect, it } from 'vitest';

import { useI18n } from './use-i18n.neutral';

describe('neutral useI18n', () => {
  it('provides a direct i18next fallback for non-framework adapters', () => {
    const result = useI18n();

    expect(result.t('missing.key', { defaultValue: 'fallback' })).toBe('fallback');
    expect(result.i18n).toBe(result.i18next);
    expect(result.locale).toBeTypeOf('string');
    expect(result.setLocale).toBeTypeOf('function');
  });
});
