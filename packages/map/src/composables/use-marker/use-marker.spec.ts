import { describe, expect, it } from 'vitest';

import { useMarker } from './use-marker';

describe('useMarker', () => {
  it('does not create a marker before the map is ready', () => {
    expect(useMarker(undefined, { lngLat: [0, 0] }).marker).toBeUndefined();
  });
});
