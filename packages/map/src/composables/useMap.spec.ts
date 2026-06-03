import { defineComponent, nextTick, provide, shallowRef } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { Map } from 'maplibre-gl'

import { mapKey } from './injectionKeys'
import { useMap } from './useMap'

vi.mock('maplibre-gl', () => ({}))

describe('useMap', () => {
  it('returns the map ref provided by the parent', () => {
    const mapRef = shallowRef<Map | null>(null)
    let capturedMap: ReturnType<typeof useMap>['map'] | undefined

    const Consumer = defineComponent({
      setup() {
        const result = useMap()
        capturedMap = result.map
      },
      template: '<div />',
    })

    const Parent = defineComponent({
      components: { Consumer },
      setup() {
        provide(mapKey, mapRef)
      },
      template: '<Consumer />',
    })

    mount(Parent)
    expect(capturedMap?.value).toBeNull()
  })

  it('reflects updates to the injected map ref', async () => {
    const mapRef = shallowRef<Map | null>(null)
    let capturedMap: ReturnType<typeof useMap>['map'] | undefined

    const Consumer = defineComponent({
      setup() {
        const result = useMap()
        capturedMap = result.map
      },
      template: '<div />',
    })

    const Parent = defineComponent({
      components: { Consumer },
      setup() {
        provide(mapKey, mapRef)
      },
      template: '<Consumer />',
    })

    mount(Parent)

    const fakeMap = {} as Map
    mapRef.value = fakeMap
    await nextTick()

    expect(capturedMap?.value).toBe(fakeMap)
  })

  it('throws when no map context is provided', () => {
    const Consumer = defineComponent({
      setup() {
        return useMap()
      },
      template: '<div />',
    })

    expect(() => mount(Consumer)).toThrowError('[useMap]')
  })
})
