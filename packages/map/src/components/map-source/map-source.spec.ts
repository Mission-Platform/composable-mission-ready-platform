import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapSource from './map-source.vue';

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}));

describe('MapSource', () => {
  it('adds the source to the map when rendered inside <MapLibre>', async () => {
    const { mapReference } = mountWithMap({
      slots: {
        default: `<MapSource id="test-source" :source="{ type: 'geojson', data: { type: 'FeatureCollection', features: [] } }" />`,
      },
      components: { MapSource },
    });

    await nextTick();

    expect(mapReference.value?.addSource).toHaveBeenCalledWith('test-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  });
});
