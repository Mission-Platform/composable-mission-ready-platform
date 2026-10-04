// ─── useSource ────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge-jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`.

import { useEffect, useRef } from '@mission-platform/forge-jsx';

import type { GeoJSONSource, Map, SourceSpecification } from 'maplibre-gl';

export interface UseSourceOptions {
  /** Unique ID for the source. Must match the `source` referenced by layers. */
  id: string;
  /** Source specification. Changing this value updates or replaces the source. */
  source: SourceSpecification;
}

/** Determines whether an existing source can accept an in-place GeoJSON data update. */
function canUpdateGeoJsonInPlace(
  map: Map,
  id: string,
  spec: SourceSpecification,
  previousSpec?: SourceSpecification,
  previousMap?: Map,
): boolean {
  if (spec.type !== 'geojson') {
    return false;
  }
  if (previousMap && previousMap !== map) {
    return false;
  }
  return previousSpec ? previousSpec.type === 'geojson' : Boolean(map.getSource(id));
}

/**
 * Attempts to fast-path update a GeoJSON source's data in place without removing it.
 */
function tryUpdateGeoJsonSource(
  map: Map,
  id: string,
  spec: SourceSpecification,
  previousSpec?: SourceSpecification,
  previousMap?: Map,
): boolean {
  if (!canUpdateGeoJsonInPlace(map, id, spec, previousSpec, previousMap)) {
    return false;
  }

  const existing = map.getSource(id) as GeoJSONSource | undefined;
  if (typeof existing?.setData === 'function') {
    existing.setData(spec.data as Parameters<GeoJSONSource['setData']>[0]);
    return true;
  }
  return false;
}

/** Safely removes a source from a map instance without throwing if already removed. */
function safeRemoveSource(map: Map | undefined, id: string): void {
  if (map?.getSource(id)) {
    try {
      map.removeSource(id);
    } catch {
      // ignore
    }
  }
}

/** Safely adds a source to a map instance if it is not already present. */
function safeAddSource(map: Map, id: string, spec: SourceSpecification): void {
  if (!map.getSource(id)) {
    try {
      map.addSource(id, spec);
    } catch {
      // ignore
    }
  }
}

/**
 * Registers a MapLibre data source and keeps it in sync with the map.
 *
 * The source is added once the map is ready and removed when the component
 * unmounts. If `source` changes and the source type stays `geojson`, only the
 * `data` is swapped via `GeoJSONSource.setData()` — fast and non-destructive
 * (layers referencing the source are preserved). A full remove-then-add is only
 * performed when the source type or structural options change.
 *
 * @example
 * ```ts
 * const map = useMap();
 * useSource(map, { id: 'earthquakes', source: geojsonSpec });
 * ```
 */
export function useSource(map: Map | undefined, options: UseSourceOptions): void {
  const { id } = options;
  const previousSpecReference = useRef<SourceSpecification | undefined>();
  const previousMapReference = useRef<Map | undefined>();

  useEffect(() => {
    if (!map) {
      return () => {};
    }

    const spec = options.source;
    // The stored `Map` and `SourceSpecification` are read back from refs. On the
    // Vue build a `ref<T>().value` is Vue's deep `UnwrapRef<T>` — a recursive
    // expansion of these large maplibre types — so their nominal types are
    // re-asserted here. Used directly, the later comparison/`.data` access would
    // overflow the declaration emitter's instantiation depth (TS2589).
    const previousSpec = previousSpecReference.current as unknown as SourceSpecification | undefined;
    const previousMap = previousMapReference.current as unknown as Map | undefined;

    // Fast path: GeoJSON source already exists — swap the data in place so all
    // referencing layers stay intact and no source teardown is needed.
    if (tryUpdateGeoJsonSource(map, id, spec, previousSpec, previousMap)) {
      previousSpecReference.current = spec;
      previousMapReference.current = map;
      return () => {};
    }

    // Structural change or first mount: remove old source (if any) then add.
    if (previousMap && previousMap !== map) {
      safeRemoveSource(previousMap, id);
    }
    safeAddSource(map, id, spec);
    previousSpecReference.current = spec;
    previousMapReference.current = map;

    /** Re-adds the source if it was lost during a style reload. */
    const reapplySource = (): void => {
      safeAddSource(map, id, spec);
    };

    map.on('styledata', reapplySource);
    map.on('style.load', reapplySource);

    return () => {
      map.off('styledata', reapplySource);
      map.off('style.load', reapplySource);
    };
  }, [map, options.source]);

  useEffect(() => {
    return () => {
      safeRemoveSource(previousMapReference.current, id);
    };
  }, []);
}
