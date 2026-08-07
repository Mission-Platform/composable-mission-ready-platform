// ─── useSource ────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`.

import { useEffect, useRef } from '@mission-platform/forge';

import type { GeoJSONSource, Map, SourceSpecification } from 'maplibre-gl';

export interface UseSourceOptions {
  /** Unique ID for the source. Must match the `source` referenced by layers. */
  id: string;
  /** Source specification. Changing this value updates or replaces the source. */
  source: SourceSpecification;
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
  const previousSpecReference = useRef<SourceSpecification | undefined>(undefined);
  const previousMapReference = useRef<Map | undefined>(undefined);

  useEffect(() => {
    if (!map) {
      return;
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
    if (spec.type === 'geojson' && previousSpec?.type === 'geojson' && map === previousMap) {
      const existing = map.getSource(id) as GeoJSONSource | undefined;
      if (existing?.setData) {
        existing.setData(spec.data as Parameters<GeoJSONSource['setData']>[0]);
        previousSpecReference.current = spec;
        previousMapReference.current = map;
        return;
      }
    }

    // Structural change or first mount: remove old source (if any) then add.
    if (previousMap?.getSource(id)) {
      previousMap.removeSource(id);
    }
    if (!map.getSource(id)) {
      map.addSource(id, spec);
    }
    previousSpecReference.current = spec;
    previousMapReference.current = map;
  }, [map, options.source]);

  // Remove the source only on unmount (child layers are removed first as they
  // unmount before this parent effect's cleanup runs).
  useEffect(() => {
    return () => {
      const map_ = previousMapReference.current;
      if (map_ && map_.getSource(id)) {
        try {
          map_.removeSource(id);
        } catch {
          // A layer may still reference the source mid-teardown; ignore.
        }
      }
    };
  }, []);
}
