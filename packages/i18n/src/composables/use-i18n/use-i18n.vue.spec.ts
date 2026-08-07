import { describe, expect, it } from 'vitest';

import { useI18n } from './use-i18n.vue';

describe('Vue useI18n', () => {
  it('exports a composable function', () => {
    expect(useI18n).toBeTypeOf('function');
  });
});
