import { type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { Popup, type PopupOptions, type LngLatLike } from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
export interface UsePopupOptions extends PopupOptions {
    /** Longitude/latitude position of the popup. */
    lngLat: MaybeRefOrGetter<LngLatLike>;
    /** HTML string or plain text to display inside the popup. */
    content: MaybeRefOrGetter<string>;
    /** When `true`, content is treated as plain text (XSS-safe). Defaults to `false`. */
    isText?: boolean;
    /** Whether the popup is currently open. Defaults to `true`. */
    open?: MaybeRefOrGetter<boolean>;
}
export interface UsePopupReturn {
    /** Reactive reference to the underlying `Popup` instance. */
    popup: ShallowRef<Popup | null>;
}
/**
 * Creates a reactive MapLibre `Popup` that is automatically added to and removed
 * from the map as the owning component mounts and unmounts.
 *
 * Reactively updates position, content, and open/closed state.
 *
 * @example
 * ```ts
 * const { map } = useMap()
 * const { popup } = usePopup(map, {
 *   lngLat: [-0.127758, 51.507351],
 *   content: computed(() => `<strong>${cityName.value}</strong>`),
 * })
 * ```
 */
export declare function usePopup(mapRef: ShallowRef<Map | null>, options: UsePopupOptions): UsePopupReturn;
