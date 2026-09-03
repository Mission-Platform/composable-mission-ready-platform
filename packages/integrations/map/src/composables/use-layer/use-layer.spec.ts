import { describe, expect, it } from 'vitest';

import { useLayer } from './use-layer';

describe('useLayer', () => {
  it('does nothing before the map is ready', () => {
    expect(() => useLayer(undefined, { layer: { id: 'empty', type: 'circle' } })).not.toThrow();
  });
});
