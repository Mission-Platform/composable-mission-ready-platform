// ─── useLayer ─────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`.

import { useEffect, useRef } from '@mission-platform/forge';

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

/**
 * Sync a layer's `paint`, `layout`, `filter` and zoom range onto the live map
 * without removing/re-adding it. Only properties whose value actually changed
 * are re-applied, so an unchanged symbol layer is never needlessly re-laid-out.
 */
function updateLayerInPlace(map: Map, spec: LayerSpecification, previousSpec: LayerSpecification): void {
  const id = spec.id;
  const next = spec as MutableLayerSpec;
  const previous = previousSpec as MutableLayerSpec;

  const previousPaint = previous.paint ?? {};
  const nextPaint = next.paint ?? {};
  for (const key of new Set([...Object.keys(previousPaint), ...Object.keys(nextPaint)])) {
    if (!specValuesEqual(previousPaint[key], nextPaint[key])) {
      map.setPaintProperty(id, key, nextPaint[key]);
    }
  }

  const previousLayout = previous.layout ?? {};
  const nextLayout = next.layout ?? {};
  for (const key of new Set([...Object.keys(previousLayout), ...Object.keys(nextLayout)])) {
    if (!specValuesEqual(previousLayout[key], nextLayout[key])) {
      map.setLayoutProperty(id, key, nextLayout[key]);
    }
  }

  if (!specValuesEqual(previous.filter, next.filter)) {
    map.setFilter(id, next.filter as Parameters<Map['setFilter']>[1]);
  }

  if (previous.minzoom !== next.minzoom || previous.maxzoom !== next.maxzoom) {
    map.setLayerZoomRange(id, next.minzoom ?? 0, next.maxzoom ?? 24);
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
  const previousSpecReference = useRef<LayerSpecification | undefined>(undefined);
  const previousBeforeIdReference = useRef<string | undefined>(undefined);
  const mapReference = useRef<Map | undefined>(undefined);
  // A `sourcedata` listener registered while we wait for a referenced source to
  // appear. Held so it can be torn down on re-run and unmount.
  const pendingListenerReference = useRef<(() => void) | undefined>(undefined);

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
      pendingListenerReference.current = undefined;
    }

    // Fast path: the layer already exists and only its visual properties
    // changed. Sync them in place instead of removing and re-adding the layer,
    // which would restart symbol placement every render and can crash MapLibre.
    const structurallyUnchanged =
      previousSpec !== undefined &&
      map === previousMap &&
      previousSpec.id === spec.id &&
      previousSpec.type === spec.type &&
      layerSourceKey(previousSpec) === layerSourceKey(spec);

    if (structurallyUnchanged && map.getLayer(spec.id)) {
      if (options.beforeId !== previousBeforeIdReference.current) {
        map.moveLayer(spec.id, options.beforeId);
      }
      updateLayerInPlace(map, spec, previousSpec);
      previousSpecReference.current = spec;
      previousBeforeIdReference.current = options.beforeId;
      mapReference.current = map;
      return;
    }

    // Structural change / first mount / map change: remove the old layer then
    // (re)add it. Remove from whichever map still holds it.
    if (previousSpec) {
      if (previousMap?.getLayer(previousSpec.id)) {
        previousMap.removeLayer(previousSpec.id);
      } else if (map.getLayer(previousSpec.id)) {
        map.removeLayer(previousSpec.id);
      }
    }

    // The source a layer references (a string ID). Background layers and layers
    // with an inline source object have none, so there is nothing to await.
    let sourceId: string | undefined;
    if (typeof spec === 'object' && spec !== null) {
      const nonPrimitive: object = spec;
      if ('source' in nonPrimitive && typeof (nonPrimitive as { source: unknown }).source === 'string') {
        sourceId = (nonPrimitive as { source: string }).source;
      }
    }

    if (!map.getLayer(spec.id)) {
      if (sourceId && !map.getSource(sourceId)) {
        // Child (layer) effects run *before* parent (source) effects, so on
        // first mount the source this layer references may not exist yet.
        // Adding the layer now would throw "source not found"; instead defer
        // until the map signals the source has been registered.
        const addWhenSourceReady = (): void => {
          if (map.getSource(sourceId) && !map.getLayer(spec.id)) {
            map.addLayer(spec, options.beforeId);
            map.off('sourcedata', addWhenSourceReady);
            pendingListenerReference.current = undefined;
          }
        };
        pendingListenerReference.current = addWhenSourceReady;
        map.on('sourcedata', addWhenSourceReady);
      } else {
        map.addLayer(spec, options.beforeId);
      }
    }

    previousSpecReference.current = spec;
    previousBeforeIdReference.current = options.beforeId;
    mapReference.current = map;
  }, [map, options.layer, options.beforeId]);

  useEffect(() => {
    return () => {
      const map_ = mapReference.current as unknown as Map | undefined;
      const spec = previousSpecReference.current as unknown as LayerSpecification | undefined;
      if (map_ && pendingListenerReference.current) {
        map_.off('sourcedata', pendingListenerReference.current);
        pendingListenerReference.current = undefined;
      }
      if (map_ && spec && map_.getLayer(spec.id)) {
        try {
          map_.removeLayer(spec.id);
        } catch {
          // The source may already be gone mid-teardown; ignore.
        }
      }
    };
  }, []);
}
