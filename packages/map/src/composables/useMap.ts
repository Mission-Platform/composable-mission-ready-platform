import { inject, type ShallowRef } from 'vue'
import type { Map } from 'maplibre-gl'

import { mapKey } from './injectionKeys'

export interface UseMapReturn {
  /** Reactive reference to the MapLibre `Map` instance. `null` until the map has loaded. */
  map: ShallowRef<Map | null>
}

/**
 * Returns the reactive MapLibre `Map` instance provided by the nearest `<MapLibre>` ancestor.
 *
 * Must be called inside a component that is a descendant of `<MapLibre>`.
 *
 * @example
 * ```ts
 * const { map } = useMap()
 * watchEffect(() => {
 *   if (map.value) map.value.flyTo({ center: [lng, lat] })
 * })
 * ```
 */
export function useMap(): UseMapReturn {
  const map = inject(mapKey)

  if (!map) {
    throw new Error(
      '[useMap] No map context found. Make sure this composable is called inside a <MapLibre> component.',
    )
  }

  return { map }
}
