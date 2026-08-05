import { type MpElement, type MpProperties } from '@mission-platform/forge';

import { useLayer } from '../../../composables/use-layer';
import { useMap } from '../../../composables/use-map';

import type { LayerSpecification } from 'maplibre-gl';

export interface MapLayerProperties extends MpProperties {
  /** Full MapLibre layer specification. Reactively replaced when changed. */
  layer: LayerSpecification;
  /**
   * ID of an existing layer to insert *before* (i.e. render below that layer).
   * When omitted the layer is drawn on top of all other layers.
   */
  beforeId?: string;
}

/**
 * `BaseMapLayer` — adds a MapLibre layer to the nearest `<MapLibre>` ancestor's
 * map. Renders no DOM of its own (the layer lives inside the map canvas).
 * Authored once in the neutral JSX dialect.
 */
export function BaseMapLayer(properties: Readonly<MapLayerProperties>): MpElement | null {
  const map = useMap();
  useLayer(map, { layer: properties.layer, beforeId: properties.beforeId });

  // Renders no DOM of its own: an empty render is authored as `null`, which the
  // React build emits verbatim (React renders nothing) and the Vue build turns
  // into an empty render that outputs nothing.
  return null;
}
