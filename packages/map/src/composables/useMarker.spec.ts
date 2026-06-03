import { defineComponent, nextTick, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Map, LngLatLike } from 'maplibre-gl'

import { useMarker } from './useMarker'

const { mockSetLngLat, mockAddTo, mockRemove, MockMarker } = vi.hoisted(() => {
  const mockSetLngLat = vi.fn().mockReturnThis()
  const mockAddTo = vi.fn().mockReturnThis()
  const mockRemove = vi.fn()
  function MockMarkerImpl() {
    return { setLngLat: mockSetLngLat, addTo: mockAddTo, remove: mockRemove }
  }
  return { mockSetLngLat, mockAddTo, mockRemove, MockMarker: vi.fn().mockImplementation(MockMarkerImpl) }
})

vi.mock('maplibre-gl', () => ({
  Marker: MockMarker,
}))

describe('useMarker', () => {
  let fakeMap: Map

  beforeEach(() => {
    fakeMap = {} as Map
    vi.clearAllMocks()
    MockMarker.mockImplementation(function () {
      return { setLngLat: mockSetLngLat, addTo: mockAddTo, remove: mockRemove }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a Marker and adds it to the map when the map ref becomes available', async () => {
    const mapRef = shallowRef<Map | null>(null)
    const lngLat: LngLatLike = [-0.127758, 51.507351]

    const Wrapper = defineComponent({
      setup() {
        return useMarker(mapRef, { lngLat })
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()

    expect(MockMarker).not.toHaveBeenCalled()

    mapRef.value = fakeMap
    await nextTick()

    expect(MockMarker).toHaveBeenCalledOnce()
    expect(mockSetLngLat).toHaveBeenCalledWith(lngLat)
    expect(mockAddTo).toHaveBeenCalledWith(fakeMap)
  })

  it('updates the marker position when lngLat changes', async () => {
    const mapRef = shallowRef<Map | null>(fakeMap)
    const position = shallowRef<LngLatLike>([-0.127758, 51.507351])

    const Wrapper = defineComponent({
      setup() {
        return useMarker(mapRef, { lngLat: position })
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()

    const newPosition: LngLatLike = [2.3522, 48.8566]
    position.value = newPosition
    await nextTick()

    expect(mockSetLngLat).toHaveBeenLastCalledWith(newPosition)
  })

  it('removes the marker on unmount', async () => {
    const mapRef = shallowRef<Map | null>(fakeMap)

    const Wrapper = defineComponent({
      setup() {
        return useMarker(mapRef, { lngLat: [0, 0] })
      },
      template: '<div />',
    })

    const wrapper = mount(Wrapper)
    await nextTick()
    wrapper.unmount()

    expect(mockRemove).toHaveBeenCalledOnce()
  })

  it('returns a reactive marker ref that is null before the map is ready', async () => {
    const mapRef = shallowRef<Map | null>(null)
    let markerRef: ReturnType<typeof useMarker>['marker'] | undefined

    const Wrapper = defineComponent({
      setup() {
        const result = useMarker(mapRef, { lngLat: [0, 0] })
        markerRef = result.marker
        return result
      },
      template: '<div />',
    })

    mount(Wrapper)
    await nextTick()

    expect(markerRef?.value).toBeNull()
  })

  it('exposes the Marker instance once the map is set', async () => {
    const mapRef = shallowRef<Map | null>(null)
    let markerRef: ReturnType<typeof useMarker>['marker'] | undefined

    const Wrapper = defineComponent({
      setup() {
        const result = useMarker(mapRef, { lngLat: [0, 0] })
        markerRef = result.marker
        return result
      },
      template: '<div />',
    })

    mount(Wrapper)
    mapRef.value = fakeMap
    await nextTick()

    expect(markerRef?.value).not.toBeNull()
    expect(markerRef?.value).toBeInstanceOf(Object)
  })
})
