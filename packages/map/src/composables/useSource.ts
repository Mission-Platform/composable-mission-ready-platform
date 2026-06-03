import {
  type MaybeRefOrGetter,
  type ShallowRef,
  onUnmounted,
  toValue,
  watch,
} from 'vue'
import type { GeoJSONSource, Map, SourceSpecification } from 'maplibre-gl'

export interface UseSourceOptions {
  /** Unique ID for the source. Must match the `source` referenced by layers. */
  id: string
  /** Reactive source specification. Changing this value replaces the source. */
  source: MaybeRefOrGetter<SourceSpecification>
}

/**
 * Registers a MapLibre data source and keeps it in sync with the map.
 *
 * The source is added once the map is ready and removed when the component
 * unmounts. If `source` changes reactively and the source type stays `geojson`,
 * only the `data` is swapped via `GeoJSONSource.setData()` — which is fast and
 * non-destructive (layers referencing the source are preserved). A full
 * remove-then-add is only performed when the source type or structural options
 * change.
 *
 * @example
 * ```ts
 * const { map } = useMap()
 * useSource(map, {
 *   id: 'earthquakes',
 *   source: computed(() => ({
 *     type: 'geojson',
 *     data: props.geojsonUrl,
 *   })),
 * })
 * ```
 */
export function useSource(mapRef: ShallowRef<Map | null>, options: UseSourceOptions): void {
  const { id } = options

  function addSource(map: Map, spec: SourceSpecification): void {
    if (!map.getSource(id)) {
      map.addSource(id, spec)
    }
  }

  function removeSource(map: Map): void {
    if (map.getSource(id)) {
      map.removeSource(id)
    }
  }

  watch(
    [mapRef, () => toValue(options.source)] as const,
    ([map, spec], prev) => {
      if (!map) return

      const prevMap = prev?.[0]
      const prevSpec = prev?.[1]

      // Fast path: GeoJSON source already exists — just swap the data in place.
      // This keeps all referencing layers intact and avoids a full source teardown.
      if (
        spec.type === 'geojson' &&
        prevSpec?.type === 'geojson' &&
        map === prevMap
      ) {
        const existing = map.getSource(id) as GeoJSONSource | undefined
        if (existing?.setData) {
          existing.setData(spec.data as Parameters<GeoJSONSource['setData']>[0])
          return
        }
      }

      // Structural change or first mount: remove old source (if any) then add.
      if (prevMap) {
        removeSource(prevMap)
      }

      addSource(map, spec)
    },
    { immediate: true, deep: true },
  )

  onUnmounted(() => {
    const map = mapRef.value
    if (map) removeSource(map)
  })
}
