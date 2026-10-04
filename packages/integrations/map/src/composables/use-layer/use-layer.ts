// ─── useLayer ─────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge-jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`.

import { useEffect, useRef } from '@mission-platform/forge-jsx';

import type { LayerSpecification, Map } from 'maplibre-gl';

export interface UseLayerOptions {
  /** Full MapLibre layer specification. */
  layer: LayerSpecification;
  /**
   * ID of an existing layer to insert the new layer *before* (i.e. below it).
   * When omitted the layer is appended on top of all existing layers.
   */
  beforeId?: string;
}

/** The loosely-typed slice of a layer spec whose values we sync in place. */
interface MutableLayerSpec {
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown;
  source?: unknown;
  minzoom?: number;
  maxzoom?: number;
}

/** Structural equality via JSON — adequate for paint/layout/filter expressions. */
function specValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The `source` a layer references, as a stable comparison key. */
function layerSourceKey(spec: LayerSpecification): string | undefined {
  if (typeof spec !== 'object' || spec === null) {
    return undefined;
  }
  const nonPrimitive: object = spec;
  return 'source' in nonPrimitive ? JSON.stringify((nonPrimitive as { source: unknown }).source) : undefined;
}

/** Extracts the referenced source ID from a layer spec when specified as a string. */
function extractLayerSourceId(spec: LayerSpecification): string | undefined {
  if (typeof spec === 'object' && spec !== null) {
    const nonPrimitive: object = spec;
    if ('source' in nonPrimitive && typeof (nonPrimitive as { source: unknown }).source === 'string') {
      return (nonPrimitive as { source: string }).source;
    }
  }
  return undefined;
}

/** Synchronizes a single paint property if its value has changed. */
function syncSinglePaintProperty(
  map: Map,
  id: string,
  key: string,
  previous?: MutableLayerSpec,
  next?: MutableLayerSpec,
): void {
  const previousVal = previous?.paint?.[key];
  const nextVal = next?.paint?.[key];
  if (!previous || !specValuesEqual(previousVal, nextVal)) {
    try {
      map.setPaintProperty(
        id,
        key as Parameters<Map['setPaintProperty']>[1],
        nextVal as Parameters<Map['setPaintProperty']>[2],
      );
    } catch {
      // ignore
    }
  }
}

/** Synchronizes changed paint properties on an existing layer in place. */
function syncPaintProperties(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  const previousPaint = previous?.paint ?? {};
  const nextPaint = next?.paint ?? {};
  for (const key of new Set([...Object.keys(previousPaint), ...Object.keys(nextPaint)])) {
    syncSinglePaintProperty(map, id, key, previous, next);
  }
}

/** Synchronizes a single layout property if its value has changed. */
function syncSingleLayoutProperty(
  map: Map,
  id: string,
  key: string,
  previous?: MutableLayerSpec,
  next?: MutableLayerSpec,
): void {
  const previousVal = previous?.layout?.[key];
  const nextVal = next?.layout?.[key];
  if (!previous || !specValuesEqual(previousVal, nextVal)) {
    try {
      map.setLayoutProperty(
        id,
        key as Parameters<Map['setLayoutProperty']>[1],
        nextVal as Parameters<Map['setLayoutProperty']>[2],
      );
    } catch {
      // ignore
    }
  }
}

/** Synchronizes changed layout properties on an existing layer in place. */
function syncLayoutProperties(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  const previousLayout = previous?.layout ?? {};
  const nextLayout = next?.layout ?? {};
  for (const key of new Set([...Object.keys(previousLayout), ...Object.keys(nextLayout)])) {
    syncSingleLayoutProperty(map, id, key, previous, next);
  }
}

/** Synchronizes layer filter expression on an existing layer. */
function syncFilterProperty(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  if (!previous || !specValuesEqual(previous.filter, next?.filter)) {
    try {
      map.setFilter(id, next?.filter as Parameters<Map['setFilter']>[1]);
    } catch {
      // ignore
    }
  }
}

/** Synchronizes minzoom and maxzoom range on an existing layer. */
function syncZoomRange(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  if (!previous || previous.minzoom !== next?.minzoom || previous.maxzoom !== next?.maxzoom) {
    try {
      map.setLayerZoomRange(id, next?.minzoom ?? 0, next?.maxzoom ?? 24);
    } catch {
      // ignore
    }
  }
}

/** Synchronizes filter and zoom range properties on an existing layer in place. */
function syncFilterAndZoom(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  syncFilterProperty(map, id, previous, next);
  syncZoomRange(map, id, previous, next);
}

/**
 * Sync a layer's `paint`, `layout`, `filter` and zoom range onto the live map
 * without removing/re-adding it. Only properties whose value actually changed
 * are re-applied, so an unchanged symbol layer is never needlessly re-laid-out.
 */
function updateLayerInPlace(map: Map, spec: LayerSpecification, previousSpec?: LayerSpecification): void {
  const id = spec.id;
  const next = spec as MutableLayerSpec;
  const previous = previousSpec as MutableLayerSpec | undefined;

  syncPaintProperties(map, id, previous, next);
  syncLayoutProperties(map, id, previous, next);
  syncFilterAndZoom(map, id, previous, next);
}

/** Checks whether the layer structure is identical and can be updated in place. */
function isLayerStructurallyUnchanged(
  spec: LayerSpecification,
  previousSpec: LayerSpecification | undefined,
  map: Map,
  previousMap: Map | undefined,
): boolean {
  return (
    previousSpec !== undefined &&
    map === previousMap &&
    previousSpec.id === spec.id &&
    previousSpec.type === spec.type &&
    layerSourceKey(previousSpec) === layerSourceKey(spec)
  );
}

/** Safely removes a layer by ID from a map instance if it exists. */
function safeRemoveLayer(map: Map | undefined, layerId: string): void {
  if (map?.getLayer(layerId)) {
    try {
      map.removeLayer(layerId);
    } catch {
      // ignore
    }
  }
}

/** Safely adds a layer to a map instance if not already present. */
function safeAddLayer(map: Map | undefined, spec: LayerSpecification, beforeId?: string): void {
  if (!map) {
    return;
  }
  try {
    map.addLayer(spec, beforeId);
  } catch {
    // ignore
  }
}

/** Checks whether a layer is ready to be added to the map. */
function canAddLayer(map: Map | undefined, layerId: string, sourceId: string | undefined): boolean {
  if (!map || map.getLayer(layerId)) {
    return false;
  }
  return !sourceId || Boolean(map.getSource(sourceId));
}

/** Removes an outdated layer from whichever map instance currently hosts it. */
function removePreviousLayer(
  previousSpec: LayerSpecification | undefined,
  previousMap: Map | undefined,
  currentMap: Map,
): void {
  if (!previousSpec) {
    return;
  }
  safeRemoveLayer(previousMap, previousSpec.id);
  safeRemoveLayer(currentMap, previousSpec.id);
}

/** Cleans up layer resources and pending event listeners on unmount. */
function cleanupLayerEffect(
  map: Map | undefined,
  spec: LayerSpecification | undefined,
  pendingListener: (() => void) | undefined,
): void {
  if (map && pendingListener) {
    map.off('sourcedata', pendingListener);
    map.off('data', pendingListener);
  }
  if (spec) {
    safeRemoveLayer(map, spec.id);
  }
}

/** Sets up deferred layer mounting when referencing a source that has not yet mounted. */
function setupDeferredLayerMount(
  map: Map,
  spec: LayerSpecification,
  sourceId: string,
  beforeId: string | undefined,
  pendingListenerRef: { current: (() => void) | undefined },
): void {
  const addWhenSourceReady = (): void => {
    if (map.getSource(sourceId) && !map.getLayer(spec.id)) {
      try {
        map.addLayer(spec, beforeId);
        map.off('sourcedata', addWhenSourceReady);
        map.off('data', addWhenSourceReady);
        pendingListenerRef.current = undefined;
      } catch {
        // Ignore if mid-teardown
      }
    }
  };
  pendingListenerRef.current = addWhenSourceReady;
  map.on('sourcedata', addWhenSourceReady);
  map.on('data', addWhenSourceReady);

  globalThis.queueMicrotask?.(() => {
    if (map && !map.getLayer(spec.id) && map.getSource(sourceId)) {
      addWhenSourceReady();
    }
  });
  setTimeout(() => {
    if (map && !map.getLayer(spec.id) && map.getSource(sourceId)) {
      addWhenSourceReady();
    }
  }, 0);
}

/**
 * Adds a MapLibre layer to the map.
 *
 * The layer is created once the map is ready. When only the `paint`, `layout`,
 * `filter` or zoom range change (same `id`, `type` and `source`), they are
 * synced onto the live layer **in place** — the layer is *not* removed and
 * re-added. This matters because callers commonly rebuild the spec object on
 * every render (e.g. an interactive drawing tool reacting to each mouse move):
 * tearing a layer down and recreating it on every render churns MapLibre's
 * symbol placement and can crash its renderer mid-frame. A full remove-then-add
 * only happens on a structural change (`id`/`type`/`source`), a `beforeId`
 * move, or a map change. On unmount the layer is cleaned up automatically.
 *
 * @example
 * ```ts
 * const map = useMap();
 * useLayer(map, { layer: circleLayerSpec });
 * ```
 */
export function useLayer(map: Map | undefined, options: UseLayerOptions): void {
  const previousSpecReference = useRef<LayerSpecification | undefined>();
  const previousBeforeIdReference = useRef<string | undefined>();
  const mapReference = useRef<Map | undefined>();
  // A `sourcedata` listener registered while we wait for a referenced source to
  // appear. Held so it can be torn down on re-run and unmount.
  const pendingListenerReference = useRef<(() => void) | undefined>();

  useEffect(() => {
    if (map) {
      const spec = options.layer;
      // The stored `Map` and `LayerSpecification` are read back from refs. On the
      // Vue build a `ref<T>().value` is Vue's deep `UnwrapRef<T>` — a recursive
      // expansion of these large maplibre types — so their nominal types are
      // re-asserted here. Used directly, later comparisons and helper calls would
      // overflow the declaration emitter's instantiation depth (TS2589).
      const previousSpec = previousSpecReference.current as unknown as LayerSpecification | undefined;
      const previousMap = mapReference.current as unknown as Map | undefined;

      // Drop any deferred-add listener left over from a previous spec/map.
      if (pendingListenerReference.current) {
        map.off('sourcedata', pendingListenerReference.current);
        map.off('data', pendingListenerReference.current);
        pendingListenerReference.current = undefined;
      }

      // Fast path: the layer already exists and only its visual properties
      // changed. Sync them in place instead of removing and re-adding the layer,
      // which would restart symbol placement every render and can crash MapLibre.
      const unchanged = isLayerStructurallyUnchanged(spec, previousSpec, map, previousMap);
      const layerExists = Boolean(map.getLayer(spec.id));

      if ((unchanged || (previousSpec === undefined && layerExists)) && layerExists) {
        if (options.beforeId !== previousBeforeIdReference.current) {
          try {
            map.moveLayer(spec.id, options.beforeId);
          } catch {
            // ignore
          }
        }
        updateLayerInPlace(map, spec, previousSpec);
        previousSpecReference.current = spec;
        previousBeforeIdReference.current = options.beforeId;
        mapReference.current = map;
      } else {
        // Structural change / first mount / map change: remove the old layer then
        // (re)add it. Remove from whichever map still holds it.
        removePreviousLayer(previousSpec, previousMap, map);

        // The source a layer references (a string ID). Background layers and layers
        // with an inline source object have none, so there is nothing to await.
        const sourceId = extractLayerSourceId(spec);

        if (!map.getLayer(spec.id)) {
          if (sourceId && !map.getSource(sourceId)) {
            setupDeferredLayerMount(map, spec, sourceId, options.beforeId, pendingListenerReference);
          } else {
            safeAddLayer(map, spec, options.beforeId);
          }
        }

        previousSpecReference.current = spec;
        previousBeforeIdReference.current = options.beforeId;
        mapReference.current = map;

        /** Re-adds the layer if it was lost during a style reload. */
        const reapplyLayer = (): void => {
          if (canAddLayer(map, spec.id, sourceId)) {
            safeAddLayer(map, spec, options.beforeId);
          }
        };

        map.on('style.load', reapplyLayer);
        map.on('styledata', reapplyLayer);

        return () => {
          map.off('style.load', reapplyLayer);
          map.off('styledata', reapplyLayer);
        };
      }
    }
  }, [map, options.layer, options.beforeId]);

  useEffect(() => {
    return () => {
      cleanupLayerEffect(
        mapReference.current as unknown as Map | undefined,
        previousSpecReference.current as unknown as LayerSpecification | undefined,
        pendingListenerReference.current,
      );
      pendingListenerReference.current = undefined;
    };
  }, []);
}
