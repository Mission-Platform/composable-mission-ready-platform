import { defineComponent, nextTick, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Map, CircleLayerSpecification } from 'maplibre-gl'

import { useLayer } from './useLayer'

vi.mock('maplibre-gl', () => ({}))

function makeFakeMap(): Map {
  return {
    getLayer: vi.fn().mockReturnValue(undefined),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  } as unknown as Map
}

const circleLayer: CircleLayerSpecification = {
  id: 'my-circles',
  type: 'circle',
  source: 'my-source',
  paint: { 'circle-radius': 6 },
}

describe('useLayer', () => {
  let fakeMap: Map

  beforeEach(() => {
    fakeMap = makeFakeMap()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds the layer to the map when the map ref becomes available', async () => {
    const mapRef = shallowRef<Map | null>(null)

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapRef, { layer: circleLayer })
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()
    expect(fakeMap.addLayer).not.toHaveBeenCalled()

    mapRef.value = fakeMap
    await nextTick()
    expect(fakeMap.addLayer).toHaveBeenCalledWith(circleLayer, undefined)
  })

  it('passes beforeId to addLayer when provided', async () => {
    const mapRef = shallowRef<Map | null>(fakeMap)

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapRef, { layer: circleLayer, beforeId: 'road-labels' })
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()
    expect(fakeMap.addLayer).toHaveBeenCalledWith(circleLayer, 'road-labels')
  })

  it('removes the layer on unmount', async () => {
    const mapRef = shallowRef<Map | null>(fakeMap)
    ;(fakeMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({})

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapRef, { layer: circleLayer })
      },
      template: '<div />',
    })

    const wrapper = mount(Wrapper)
    await nextTick()
    wrapper.unmount()

    expect(fakeMap.removeLayer).toHaveBeenCalledWith(circleLayer.id)
  })

  it('does not add a layer if it already exists', async () => {
    ;(fakeMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({})
    const mapRef = shallowRef<Map | null>(fakeMap)

    const Wrapper = defineComponent({
      setup() {
        useLayer(mapRef, { layer: circleLayer })
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()
    expect(fakeMap.addLayer).not.toHaveBeenCalled()
  })
})
