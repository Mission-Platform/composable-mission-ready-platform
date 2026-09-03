import { type MpChild, type MpElement, Slot } from '@mission-platform/forge';

import { useMap, useSource } from '@/composables';

import type { SourceSpecification } from 'maplibre-gl';

export interface MapSourceProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** Unique ID for this source. Referenced by `<MapLayer>` via its `source` field. */
  id: string;
  /** MapLibre source specification. Replaced (or `setData`-swapped) when changed. */
  source: SourceSpecification;
}

/**
 * `ForgeMapSource` — registers a MapLibre data source on the nearest `<MapLibre>`
 * ancestor's map and renders its default slot (typically the `<MapLayer>`s that
 * reference this source). Authored once in the neutral JSX dialect.
 */
export function ForgeMapSource(properties: Readonly<MapSourceProperties>): MpElement {
  const map = useMap();
  useSource(map, { id: properties.id, source: properties.source });

  return <Slot />;
}
