import { useLayer, useMap } from '@/composables';

import type { MpElement } from '@mission-platform/forge';
import type { LayerSpecification } from 'maplibre-gl';

export interface MapLayerProperties {
  /** Full MapLibre layer specification. Reactively replaced when changed. */
  layer: LayerSpecification;
  /**
   * ID of an existing layer to insert *before* (i.e. render below that layer).
   * When omitted the layer is drawn on top of all other layers.
   */
  beforeId?: string;
}

/**
 * `ForgeMapLayer` — adds a MapLibre layer to the nearest `<MapLibre>` ancestor's
 * map. Renders no DOM of its own (the layer lives inside the map canvas).
 * Authored once in the neutral JSX dialect.
 */
export function ForgeMapLayer(properties: Readonly<MapLayerProperties>): MpElement | null {
  const map = useMap();
  useLayer(map, { layer: properties.layer, beforeId: properties.beforeId });

  // Renders no DOM of its own: an empty render is authored as `null`, which the
  // React build emits verbatim (React renders nothing) and the Vue build turns
  // into an empty render that outputs nothing.
  return null;
}
