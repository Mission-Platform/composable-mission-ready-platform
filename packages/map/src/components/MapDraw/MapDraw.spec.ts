import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { mountWithMap } from '../../test-utils/mountWithMap'
import MapDraw from './MapDraw.vue'

vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
}))

describe('MapDraw', () => {
  it('renders without errors inside <MapLibre> context', async () => {
    const { wrapper } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    })

    await nextTick()
    expect(wrapper.exists()).toBe(true)
  })

  it('registers committed, draft, and vertex sources on the map', async () => {
    const { mapRef } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    })

    await nextTick()

    const addSourceCalls = (mapRef.value?.addSource as ReturnType<typeof vi.fn>).mock.calls
    const sourceIds = addSourceCalls.map(([id]: [string]) => id)

    expect(sourceIds).toContain('map-draw-committed')
    expect(sourceIds).toContain('map-draw-draft')
    expect(sourceIds).toContain('map-draw-vertices')
  })

  it('registers fill, line, draft-fill, draft-line and vertex layers on the map', async () => {
    const { mapRef } = mountWithMap({
      slots: { default: '<MapDraw />' },
      components: { MapDraw },
    })

    await nextTick()

    const addLayerCalls = (mapRef.value?.addLayer as ReturnType<typeof vi.fn>).mock.calls
    const layerIds = addLayerCalls.map(([spec]: [{ id: string }]) => spec.id)

    expect(layerIds).toContain('map-draw-fill')
    expect(layerIds).toContain('map-draw-line')
    expect(layerIds).toContain('map-draw-draft-fill')
    expect(layerIds).toContain('map-draw-draft-line')
    expect(layerIds).toContain('map-draw-vertices-circle')
  })
})
