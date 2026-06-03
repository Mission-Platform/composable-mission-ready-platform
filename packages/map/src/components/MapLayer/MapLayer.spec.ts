import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mountWithMap } from '../../test-utils/mountWithMap'
import MapLayer from './MapLayer.vue'

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}))

const circleLayerJson = JSON.stringify({
  id: 'test-layer',
  type: 'circle',
  source: 'test-source',
  paint: { 'circle-radius': 6 },
})

describe('MapLayer', () => {
  it('adds the layer to the map when rendered inside <MapLibre>', async () => {
    const { mapRef } = mountWithMap({
      slots: {
        default: `<MapLayer :layer="${circleLayerJson.replace(/"/g, "'")}" />`,
      },
      components: { MapLayer },
    })

    await nextTick()

    expect(mapRef.value?.addLayer).toHaveBeenCalledWith(
      { id: 'test-layer', type: 'circle', source: 'test-source', paint: { 'circle-radius': 6 } },
      undefined,
    )
  })
})
