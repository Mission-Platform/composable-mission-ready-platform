import { type ShallowRef } from 'vue';
import type { Map } from 'maplibre-gl';
export interface UseMapReturn {
    /** Reactive reference to the MapLibre `Map` instance. `null` until the map has loaded. */
    map: ShallowRef<Map | null>;
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
export declare function useMap(): UseMapReturn;
