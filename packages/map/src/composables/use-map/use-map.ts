// ─── useMap ─────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge` context
// primitive and compiled to React / Vue by `@mission-platform/vite-plugin-forge`.
// Returns the MapLibre `Map` instance provided by the nearest `<MapLibre>`
// ancestor through {@link MapContext}. `undefined` until the map has loaded (and
// when read outside a `<MapLibre>` subtree).

import { useContext } from '@mission-platform/forge';

import { MapContext } from '../../components/map-context';

import type { Map } from 'maplibre-gl';

/**
 * Returns the MapLibre `Map` instance provided by the nearest `<MapLibre>`
 * ancestor, or `undefined` when the map has not loaded yet.
 *
 * Must be called inside a component that is a descendant of `<MapLibre>`.
 *
 * @example
 * ```ts
 * const map = useMap();
 * useEffect(() => {
 *   map?.flyTo({ center: [lng, lat] });
 * }, [map]);
 * ```
 */
export function useMap(): Map | undefined {
  return useContext(MapContext);
}
