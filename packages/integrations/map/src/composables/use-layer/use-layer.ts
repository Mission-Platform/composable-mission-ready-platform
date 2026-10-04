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

/** Synchronizes changed paint properties on an existing layer in place. */
function syncPaintProperties(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  const previousPaint = previous?.paint ?? {};
  const nextPaint = next?.paint ?? {};
  for (const key of new Set([...Object.keys(previousPaint), ...Object.keys(nextPaint)])) {
    if (!previous || !specValuesEqual(previousPaint[key], nextPaint[key])) {
      try {
        map.setPaintProperty(
          id,
          key as Parameters<Map['setPaintProperty']>[1],
          nextPaint[key] as Parameters<Map['setPaintProperty']>[2],
        );
      } catch {
        // ignore
      }
    }
  }
}

/** Synchronizes changed layout properties on an existing layer in place. */
function syncLayoutProperties(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  const previousLayout = previous?.layout ?? {};
  const nextLayout = next?.layout ?? {};
  for (const key of new Set([...Object.keys(previousLayout), ...Object.keys(nextLayout)])) {
    if (!previous || !specValuesEqual(previousLayout[key], nextLayout[key])) {
      try {
        map.setLayoutProperty(
          id,
          key as Parameters<Map['setLayoutProperty']>[1],
          nextLayout[key] as Parameters<Map['setLayoutProperty']>[2],
        );
      } catch {
        // ignore
      }
    }
  }
}

/** Synchronizes filter and zoom range properties on an existing layer in place. */
function syncFilterAndZoom(map: Map, id: string, previous?: MutableLayerSpec, next?: MutableLayerSpec): void {
  if (!previous || !specValuesEqual(previous.filter, next?.filter)) {
    try {
      map.setFilter(id, next?.filter as Parameters<Map['setFilter']>[1]);
    } catch {
      // ignore
    }
  }

  if (!previous || previous.minzoom !== next?.minzoom || previous.maxzoom !== next?.maxzoom) {
    try {
      map.setLayerZoomRange(id, next?.minzoom ?? 0, next?.maxzoom ?? 24);
    } catch {
      // ignore
    }
  }
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

/** Removes an outdated layer from whichever map instance currently hosts it. */
function removePreviousLayer(
  previousSpec: LayerSpecification | undefined,
  previousMap: Map | undefined,
  currentMap: Map,
): void {
  if (!previousSpec) {
    return;
  }
  const targetMap = previousMap?.getLayer(previousSpec.id)
    ? previousMap
    : currentMap.getLayer(previousSpec.id)
      ? currentMap
      : undefined;
  if (targetMap) {
    try {
      targetMap.removeLayer(previousSpec.id);
    } catch {
      // ignore
    }
  }
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
  if (map && spec && map.getLayer(spec.id)) {
    try {
      map.removeLayer(spec.id);
    } catch {
      // The source may already be gone mid-teardown; ignore.
    }
  }
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
    if (!map) {
      return;
    }
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
      return;
    }

    // Structural change / first mount / map change: remove the old layer then
    // (re)add it. Remove from whichever map still holds it.
    removePreviousLayer(previousSpec, previousMap, map);

    // The source a layer references (a string ID). Background layers and layers
    // with an inline source object have none, so there is nothing to await.
    const sourceId = extractLayerSourceId(spec);

    if (!map.getLayer(spec.id)) {
      if (sourceId && !map.getSource(sourceId)) {
        // Child (layer) effects run *before* parent (source) effects, so on
        // first mount the source this layer references may not exist yet.
        // Adding the layer now would throw "source not found"; instead defer
        // until the map signals the source has been registered.
        const addWhenSourceReady = (): void => {
          if (map.getSource(sourceId) && !map.getLayer(spec.id)) {
            try {
              map.addLayer(spec, options.beforeId);
              map.off('sourcedata', addWhenSourceReady);
              map.off('data', addWhenSourceReady);
              pendingListenerReference.current = undefined;
            } catch {
              // Ignore if mid-teardown
            }
          }
        };
        pendingListenerReference.current = addWhenSourceReady;
        map.on('sourcedata', addWhenSourceReady);
        map.on('data', addWhenSourceReady);

        // Also check on the next event loops in case the parent source was registered synchronously
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
      } else {
        try {
          map.addLayer(spec, options.beforeId);
        } catch {
          // ignore
        }
      }
    }

    previousSpecReference.current = spec;
    previousBeforeIdReference.current = options.beforeId;
    mapReference.current = map;

    /** Re-adds the layer if it was lost during a style reload. */
    const reapplyLayer = (): void => {
      if (!map || map.getLayer(spec.id) || (sourceId && !map.getSource(sourceId))) {
        return;
      }
      try {
        map.addLayer(spec, options.beforeId);
      } catch {
        // ignore
      }
    };

    map.on('style.load', reapplyLayer);
    map.on('styledata', reapplyLayer);

    return () => {
      map.off('style.load', reapplyLayer);
      map.off('styledata', reapplyLayer);
    };
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
