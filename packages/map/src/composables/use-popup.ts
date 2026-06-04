import { type LngLatLike, type Map, Popup, type PopupOptions } from 'maplibre-gl';
import { markRaw, type MaybeRefOrGetter, onUnmounted, type ShallowRef, shallowRef, toValue, watch } from 'vue';

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
  popup: ShallowRef<Popup | undefined>;
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
export function usePopup(mapReference: ShallowRef<Map | undefined>, options: UsePopupOptions): UsePopupReturn {
  const { lngLat, content, isText = false, open = true, ...popupOptions } = options;
  const popup = shallowRef<Popup | undefined>();

  watch(
    mapReference,
    (map) => {
      if (!map) return;

      const instance = new Popup(popupOptions);
      if (isText) {
        instance.setText(toValue(content));
      } else {
        instance.setHTML(toValue(content));
      }
      instance.setLngLat(toValue(lngLat));

      if (toValue(open)) {
        instance.addTo(map);
      }

      popup.value = markRaw(instance);
    },
    { immediate: true },
  );

  watch(
    () => toValue(lngLat),
    (position) => {
      popup.value?.setLngLat(position);
    },
  );

  watch(
    () => toValue(content),
    (html) => {
      if (!popup.value) return;
      if (isText) {
        popup.value.setText(html);
      } else {
        popup.value.setHTML(html);
      }
    },
  );

  watch(
    () => toValue(open),
    (isOpen) => {
      const map = mapReference.value;
      if (!popup.value || !map) return;
      if (isOpen) {
        popup.value.addTo(map);
      } else {
        popup.value.remove();
      }
    },
  );

  onUnmounted(() => {
    popup.value?.remove();
    popup.value = undefined;
  });

  return { popup };
}
