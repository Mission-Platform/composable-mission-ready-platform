import { type MpElement, type MpProperties } from '@mission-platform/forge';

import { useMap } from '../../composables/use-map';
import { useMarker } from '../../composables/use-marker';

import type { LngLatLike, MarkerOptions } from 'maplibre-gl';

export interface MapMarkerProperties extends MpProperties {
  /** Longitude/latitude position of the marker. */
  lngLat: LngLatLike;
  /** Marker colour (CSS colour string). Overrides the default blue. */
  color?: MarkerOptions['color'];
  /** Scale factor for the default marker icon. */
  scale?: MarkerOptions['scale'];
  /** Whether the marker can be dragged by the user. */
  draggable?: MarkerOptions['draggable'];
  /** Rotates the marker to align with the map's bearing. */
  rotationAlignment?: MarkerOptions['rotationAlignment'];
  /** Aligns the marker's pitch with the map's pitch. */
  pitchAlignment?: MarkerOptions['pitchAlignment'];
  /** Fired when the marker is dragged to a new position. */
  onDragend?: (lngLat: LngLatLike) => void;
}

/**
 * `BaseMapMarker` — adds a MapLibre `Marker` to the nearest `<MapLibre>`
 * ancestor's map. Renders no DOM of its own (the marker lives in the map
 * canvas). Authored once in the neutral JSX dialect.
 */
export function BaseMapMarker(properties: Readonly<MapMarkerProperties>): MpElement | null {
  const map = useMap();
  useMarker(map, {
    lngLat: properties.lngLat,
    color: properties.color,
    scale: properties.scale,
    draggable: properties.draggable ?? false,
    rotationAlignment: properties.rotationAlignment,
    pitchAlignment: properties.pitchAlignment,
    onDragend: properties.onDragend,
  });

  // Renders no DOM of its own: an empty render is authored as `null`, which the
  // React build emits verbatim (React renders nothing) and the Vue build turns
  // into an empty render that outputs nothing.
  return null;
}
