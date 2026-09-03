import { describe, expect, it } from 'vitest';

import { useMap } from './use-map';

describe('useMap', () => {
  it('returns undefined outside a map provider', () => {
    expect(useMap()).toBeUndefined();
  });
});
