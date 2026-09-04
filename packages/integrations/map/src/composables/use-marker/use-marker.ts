// ─── useMarker ────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/forge-jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-forge`.

import { useEffect, useRef, useState } from '@mission-platform/forge-jsx';
import { type LngLatLike, type Map, Marker, type MarkerOptions } from 'maplibre-gl';

export interface UseMarkerOptions extends MarkerOptions {
  /** Longitude/latitude position of the marker. */
  lngLat: LngLatLike;
  /** Fired when the marker is dragged to a new position. */
  onDragend?: (lngLat: LngLatLike) => void;
}

export interface UseMarkerReturn {
  /** The underlying `Marker` instance, or `undefined` before the map is ready. */
  marker: Marker | undefined;
}

/**
 * Creates a MapLibre `Marker` that is automatically added to the map and removed
 * when the owning component is unmounted. The marker's position tracks `lngLat`.
 *
 * @example
 * ```ts
 * const map = useMap();
 * const { marker } = useMarker(map, { lngLat: [-0.12, 51.5] });
 * ```
 */
export function useMarker(map: Map | undefined, options: UseMarkerOptions): UseMarkerReturn {
  const { lngLat, onDragend, ...markerOptions } = options;
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [marker, setMarker] = useState<Marker | undefined>(undefined);
  const markerReference = useRef<Marker | undefined>(undefined);

  useEffect(() => {
    if (!map) {
      return;
    }
    const instance = new Marker(markerOptions);
    instance.setLngLat(lngLat).addTo(map);
    if (onDragend) {
      instance.on('dragend', () => onDragend(instance.getLngLat()));
    }
    markerReference.current = instance;
    setMarker(instance);
    return () => {
      instance.remove();
      markerReference.current = undefined;
      setMarker(undefined);
    };
  }, [map]);

  useEffect(() => {
    markerReference.current?.setLngLat(lngLat);
  }, [lngLat]);

  return { marker };
}
