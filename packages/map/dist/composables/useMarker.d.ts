import { type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { Marker, type MarkerOptions, type LngLatLike } from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
export interface UseMarkerOptions extends MarkerOptions {
    /** Initial longitude/latitude position of the marker. */
    lngLat: MaybeRefOrGetter<LngLatLike>;
}
export interface UseMarkerReturn {
    /** Reactive reference to the underlying `Marker` instance. */
    marker: ShallowRef<Marker | null>;
}
/**
 * Creates a reactive MapLibre `Marker` that is automatically added to the map
 * and removed when the owning component is unmounted.
 *
 * The marker's position reacts to changes in `lngLat`.
 *
 * @example
 * ```ts
 * const { map } = useMap()
 * const position = ref<LngLatLike>([-0.127758, 51.507351])
 * const { marker } = useMarker(map, { lngLat: position })
 * ```
 */
export declare function useMarker(mapRef: ShallowRef<Map | null>, options: UseMarkerOptions): UseMarkerReturn;
