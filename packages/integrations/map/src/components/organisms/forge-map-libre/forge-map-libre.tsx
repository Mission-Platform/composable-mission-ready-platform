import { classNames, type MpChild, type MpElement, Slot, useEffect, useRef, useState } from '@mission-platform/forge';
import { LngLat, Map, type MapMouseEvent, type MapOptions } from 'maplibre-gl';

import { MapContext } from '@/map-context';
import { centerDiffers, scalarDiffers } from '@/utils/camera';

import styles from './forge-map-libre.module.scss';

export interface MapLibreProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** MapLibre style URL or inline style object. */
  readonly mapStyle: MapOptions['style'];
  /** Initial map center as `[lng, lat]`. Defaults to `[0, 0]`. */
  center?: Required<MapOptions['center']>;
  /** Initial zoom level. Defaults to `1`. */
  zoom?: Required<MapOptions['zoom']>;
  /** Minimum allowed zoom level. */
  minZoom?: Required<MapOptions['minZoom']>;
  /** Maximum allowed zoom level. */
  maxZoom?: Required<MapOptions['maxZoom']>;
  /** Initial bearing (rotation) in degrees. Defaults to `0`. */
  bearing?: Required<MapOptions['bearing']>;
  /** Initial pitch in degrees. Defaults to `0`. */
  pitch?: Required<MapOptions['pitch']>;
  /** Whether to use cooperative gesture handling (requires Ctrl/⌘ + scroll). */
  cooperativeGestures?: Required<MapOptions['cooperativeGestures']>;
  /**
   * Attribution control options. Pass `false` to hide it entirely, or an
   * `AttributionControlOptions` object to customise it.
   */
  attributionControl?: Required<MapOptions['attributionControl']>;
  /** Fired when the map has finished loading its initial style. */
  onLoad?: (map: Map) => void;
  /** Fired whenever the map moves (pan/zoom/rotate). */
  onMove?: (map: Map) => void;
  /** Fired when the user clicks on the map canvas. */
  onClick?: (event: MapMouseEvent) => void;
  /** Fired when the user right-clicks on the map canvas. */
  onContextmenu?: (event: MapMouseEvent) => void;
}

/**
 * `ForgeMapLibre` — a MapLibre GL map container authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It creates the MapLibre `Map` after mount, provides the loaded instance to its
 * descendants through {@link MapContext} (only rendering its children — the
 * default slot — once the map has loaded), and reactively syncs the `mapStyle`,
 * `center`, `zoom`, `bearing`, and `pitch` props onto the live map. It owns its
 * styling through the co-located CSS Module `forge-map-libre.module.scss` (its own
 * `@layer mp.map` CSS).
 */
export function ForgeMapLibre(properties: Readonly<MapLibreProperties>): MpElement {
  const {
    mapStyle,
    center = [0, 0],
    zoom = 1,
    minZoom,
    maxZoom,
    bearing = 0,
    pitch = 0,
    cooperativeGestures = false,
    attributionControl,
  } = properties;

  const containerReference = useRef<HTMLDivElement | null>(null);
  const mapReference = useRef<Map | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [map, setMap] = useState<Map | undefined>(undefined);

  useEffect(() => {
    const container = containerReference.current;
    if (!container) {
      return;
    }

    const instance = new Map({
      container,
      style: mapStyle,
      center,
      zoom,
      minZoom,
      maxZoom,
      bearing,
      pitch,
      cooperativeGestures,
      attributionControl,
    });
    mapReference.current = instance;

    instance.on('load', () => {
      setMap(instance);
      properties.onLoad?.(instance);
    });
    instance.on('move', () => {
      properties.onMove?.(instance);
    });
    instance.on('click', (event) => {
      properties.onClick?.(event);
    });
    instance.on('contextmenu', (event) => {
      properties.onContextmenu?.(event);
    });

    return () => {
      instance.remove();
      mapReference.current = undefined;
      setMap(undefined);
    };
  }, []);

  useEffect(() => {
    if (mapStyle !== undefined) {
      mapReference.current?.setStyle(mapStyle);
    }
  }, [mapStyle]);

  useEffect(() => {
    const instance = mapReference.current;
    // Only re-centre when the target differs from the live centre: re-applying an
    // echoed value (the controlled `onMove` → state → prop round-trip) would emit
    // another `move` and loop, drifting the map north.
    if (instance && center && centerDiffers(instance.getCenter(), LngLat.convert(center))) {
      instance.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    const instance = mapReference.current;
    if (instance && zoom !== undefined && scalarDiffers(instance.getZoom(), zoom)) {
      instance.setZoom(zoom);
    }
  }, [zoom]);

  useEffect(() => {
    const instance = mapReference.current;
    if (instance && bearing !== undefined && scalarDiffers(instance.getBearing(), bearing)) {
      instance.setBearing(bearing);
    }
  }, [bearing]);

  useEffect(() => {
    const instance = mapReference.current;
    if (instance && pitch !== undefined && scalarDiffers(instance.getPitch(), pitch)) {
      instance.setPitch(pitch);
    }
  }, [pitch]);

  return (
    <div
      ref={containerReference}
      class={classNames(styles['forge-map-libre'])}
    >
      {map ? (
        // Vue compiles `useState` to `ref`, whose template unwrap widens class
        // instances to their public shape and drops maplibre's private fields
        // (`_setupResizeObserver`, `_resolveContainer`). Assert back to `Map` so
        // the generated SFC type-checks against `MapContext`'s `Map | undefined`.
        <MapContext.Provider value={map as unknown as Map}>
          <Slot />
        </MapContext.Provider>
      ) : undefined}
    </div>
  );
}
