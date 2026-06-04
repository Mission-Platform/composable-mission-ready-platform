import { type MaybeRefOrGetter, onUnmounted, type ShallowRef, toValue, watch } from 'vue';

import type { GeoJSONSource, Map, SourceSpecification } from 'maplibre-gl';

export interface UseSourceOptions {
  /** Unique ID for the source. Must match the `source` referenced by layers. */
  id: string;
  /** Reactive source specification. Changing this value replaces the source. */
  source: MaybeRefOrGetter<SourceSpecification>;
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
export function useSource(mapReference: ShallowRef<Map | undefined>, options: UseSourceOptions): void {
  const { id } = options;

  function addSource(map: Map, spec: SourceSpecification): void {
    if (!map.getSource(id)) {
      map.addSource(id, spec);
    }
  }

  function removeSource(map: Map): void {
    if (map.getSource(id)) {
      map.removeSource(id);
    }
  }

  watch(
    [mapReference, () => toValue(options.source)] as const,
    ([map, spec], previous) => {
      if (!map) return;

      const previousMap = previous?.[0];
      const previousSpec = previous?.[1];

      // Fast path: GeoJSON source already exists — just swap the data in place.
      // This keeps all referencing layers intact and avoids a full source teardown.
      if (spec.type === 'geojson' && previousSpec?.type === 'geojson' && map === previousMap) {
        const existing = map.getSource(id) as GeoJSONSource | undefined;
        if (existing?.setData) {
          existing.setData(spec.data as Parameters<GeoJSONSource['setData']>[0]);
          return;
        }
      }

      // Structural change or first mount: remove old source (if any) then add.
      if (previousMap) {
        removeSource(previousMap);
      }

      addSource(map, spec);
    },
    { immediate: true, deep: true },
  );

  onUnmounted(() => {
    const map = mapReference.value;
    if (map) removeSource(map);
  });
}
