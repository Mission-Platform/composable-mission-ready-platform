import { type MaybeRefOrGetter, onUnmounted, type ShallowRef, toValue, watch } from 'vue';

import type { LayerSpecification, Map } from 'maplibre-gl';

export interface UseLayerOptions {
  /** Reactive layer specification as required by MapLibre. */
  layer: MaybeRefOrGetter<LayerSpecification>;
  /**
   * ID of an existing layer to insert the new layer *before* (i.e. below it).
   * When omitted the layer is appended on top of all existing layers.
   */
  beforeId?: MaybeRefOrGetter<string | undefined>;
}

/**
 * Adds a reactive MapLibre layer to the map.
 *
 * The layer is created once the map is ready. When `layer` or `beforeId`
 * changes reactively, the old layer is removed and re-added. On unmount the
 * layer is cleaned up automatically.
 *
 * @example
 * ```ts
 * const { map } = useMap()
 * useLayer(map, {
 *   layer: {
 *     id: 'earthquakes-circle',
 *     type: 'circle',
 *     source: 'earthquakes',
 *     paint: { 'circle-radius': 6, 'circle-color': '#e55e5e' },
 *   },
 * })
 * ```
 */
export function useLayer(mapReference: ShallowRef<Map | undefined>, options: UseLayerOptions): void {
  function addLayer(map: Map, spec: LayerSpecification, beforeId?: string): void {
    if (!map.getLayer(spec.id)) {
      map.addLayer(spec, beforeId);
    }
  }

  function removeLayer(map: Map, id: string): void {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  }

  watch(
    [mapReference, () => toValue(options.layer), () => toValue(options.beforeId)] as const,
    ([map, spec, beforeId], [, previousSpec]) => {
      if (!map) return;

      if (previousSpec) {
        removeLayer(map, previousSpec.id);
      }

      addLayer(map, spec, beforeId);
    },
    { immediate: true, deep: true },
  );

  onUnmounted(() => {
    const map = mapReference.value;
    if (map) {
      const spec = toValue(options.layer);
      removeLayer(map, spec.id);
    }
  });
}
