import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { mountWithMap } from '../../test-utils/mount-with-map';

import MapLayer from './map-layer.vue';

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}));

const circleLayerJson = JSON.stringify({
  id: 'test-layer',
  type: 'circle',
  source: 'test-source',
  paint: { 'circle-radius': 6 },
});

describe('MapLayer', () => {
  it('adds the layer to the map when rendered inside <MapLibre>', async () => {
    const { mapReference } = mountWithMap({
      slots: {
        default: `<MapLayer :layer="${circleLayerJson.replaceAll('"', "'")}" />`,
      },
      components: { MapLayer },
    });

    await nextTick();

    expect(mapReference.value?.addLayer).toHaveBeenCalledWith(
      { id: 'test-layer', type: 'circle', source: 'test-source', paint: { 'circle-radius': 6 } },
      undefined,
    );
  });
});
