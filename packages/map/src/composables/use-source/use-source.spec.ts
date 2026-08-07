import { describe, expect, it } from 'vitest';

import { useSource } from './use-source';

describe('useSource', () => {
  it('does nothing before the map is ready', () => {
    expect(() =>
      useSource(undefined, {
        id: 'empty',
        source: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      }),
    ).not.toThrow();
  });
});
