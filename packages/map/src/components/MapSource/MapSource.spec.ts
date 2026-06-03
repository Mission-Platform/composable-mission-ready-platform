import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mountWithMap } from '../../test-utils/mountWithMap'
import MapSource from './MapSource.vue'

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}))

describe('MapSource', () => {
  it('adds the source to the map when rendered inside <MapLibre>', async () => {
    const { mapRef } = mountWithMap({
      slots: {
        default: `<MapSource id="test-source" :source="{ type: 'geojson', data: { type: 'FeatureCollection', features: [] } }" />`,
      },
      components: { MapSource },
    })

    await nextTick()

    expect(mapRef.value?.addSource).toHaveBeenCalledWith('test-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  })
})
