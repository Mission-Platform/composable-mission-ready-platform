import { type LngLatLike, type Map, Marker, type MarkerOptions } from 'maplibre-gl';
import { markRaw, type MaybeRefOrGetter, onUnmounted, type ShallowRef, shallowRef, toValue, watch } from 'vue';

export interface UseMarkerOptions extends MarkerOptions {
  /** Initial longitude/latitude position of the marker. */
  lngLat: MaybeRefOrGetter<LngLatLike>;
}

export interface UseMarkerReturn {
  /** Reactive reference to the underlying `Marker` instance. */
  marker: ShallowRef<Marker | undefined>;
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
export function useMarker(mapReference: ShallowRef<Map | undefined>, options: UseMarkerOptions): UseMarkerReturn {
  const { lngLat, ...markerOptions } = options;
  const marker = shallowRef<Marker | undefined>();

  watch(
    mapReference,
    (map) => {
      if (!map) return;

      const instance = new Marker(markerOptions);
      instance.setLngLat(toValue(lngLat)).addTo(map);
      marker.value = markRaw(instance);
    },
    { immediate: true },
  );

  watch(
    () => toValue(lngLat),
    (position) => {
      marker.value?.setLngLat(position);
    },
  );

  onUnmounted(() => {
    marker.value?.remove();
    marker.value = undefined;
  });

  return { marker };
}
