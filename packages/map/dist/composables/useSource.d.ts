import { type MaybeRefOrGetter, type ShallowRef } from 'vue';
import type { Map, SourceSpecification } from 'maplibre-gl';
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
export declare function useSource(mapRef: ShallowRef<Map | null>, options: UseSourceOptions): void;
