import {
  classNames,
  type MpChild,
  type MpElement,
  Slot,
  useEffect,
  useRef,
  useState,
} from '@mission-platform/forge-jsx';
import {
  LngLat,
  Map,
  NavigationControl,
  type MapMouseEvent,
  type MapOptions,
  type NavigationControlOptions,
} from 'maplibre-gl';

import { MapContext } from '@/map-context';
import { centerDiffers, scalarDiffers } from '@/utils/camera';

import styles from './forge-map-libre.module.scss';

export interface MapLibreProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  /** MapLibre style URL or inline style object. */
  readonly mapStyle?: MapOptions['style'];
  /** Alias for mapStyle. */
  readonly style?: MapOptions['style'];
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
  /**
   * Navigation control options. Pass `true` or a configuration object to show
   * zoom/compass controls, or `false` to omit. Defaults to `false`.
   */
  navigationControl?: boolean | NavigationControlOptions;
  /** Navigation control position. Defaults to `'top-right'`. */
  navigationControlPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
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
 * Determines whether the map center should be updated from props.
 */
function shouldUpdateCenter(instance: Map | undefined, center: LngLatLike | undefined): instance is Map {
  if (!instance || !center) {
    return false;
  }
  if (instance.dragPan?.isActive() || instance.touchZoomRotate?.isActive()) {
    return false;
  }
  return centerDiffers(instance.getCenter(), LngLat.convert(center));
}

/**
 * Determines whether the map zoom should be updated from props.
 */
function shouldUpdateZoom(instance: Map | undefined, zoom: number | undefined): instance is Map {
  if (!instance || zoom === undefined) {
    return false;
  }
  if (instance.scrollZoom?.isActive?.() || instance.touchZoomRotate?.isActive()) {
    return false;
  }
  return scalarDiffers(instance.getZoom(), zoom);
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
  const resolvedStyle = properties.mapStyle ?? properties.style;
  const {
    center = [0, 0],
    zoom = 1,
    minZoom,
    maxZoom,
    bearing = 0,
    pitch = 0,
    cooperativeGestures = false,
    attributionControl,
    navigationControl = false,
    navigationControlPosition = 'top-right',
  } = properties;

  const containerReference = useRef<HTMLDivElement | null>(null);
  const mapReference = useRef<Map | undefined>();
  const previousStyleReference = useRef<MapOptions['style'] | undefined>(resolvedStyle);
  const [map, setMap] = useState<Map | undefined>();

  useEffect(() => {
    const container = containerReference.current;
    if (container) {
      const instance = new Map({
        container,
        style: resolvedStyle,
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

      if (navigationControl) {
        const navOptions =
          typeof navigationControl === 'object'
            ? navigationControl
            : { showCompass: true, showZoom: true, visualizePitch: true };
        instance.addControl(new NavigationControl(navOptions), navigationControlPosition);
      }

      let isReady = false;
      /** Marks the map as ready and notifies the onLoad callback. */
      const handleReady = (): void => {
        if (isReady) {
          return;
        }
        isReady = true;
        setMap(instance);
        properties.onLoad?.(instance);
      };

      /** Safely checks whether the map style has finished loading. */
      const isStyleSafeLoaded = (): boolean => {
        try {
          const rawMap = instance as unknown as { style?: unknown };
          return Boolean(rawMap?.style && instance.isStyleLoaded());
        } catch {
          return false;
        }
      };

      if (isStyleSafeLoaded()) {
        handleReady();
      } else {
        instance.on('styledata', () => {
          if (isStyleSafeLoaded()) {
            handleReady();
          }
        });
        instance.once('load', handleReady);
        instance.once('idle', handleReady);
        setTimeout(() => {
          handleReady();
        }, 50);
      }
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
        setMap();
      };
    }
  }, []);

  useEffect(() => {
    const instance = mapReference.current;
    if (instance && resolvedStyle !== undefined && resolvedStyle !== previousStyleReference.current) {
      previousStyleReference.current = resolvedStyle;
      instance.setStyle(resolvedStyle);
    }
  }, [resolvedStyle]);

  useEffect(() => {
    const instance = mapReference.current;
    // Only re-centre when the target differs from the live centre and the user is
    // not actively interacting (dragging/touching) to prevent feedback loops.
    if (shouldUpdateCenter(instance, center)) {
      instance.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    const instance = mapReference.current;
    if (shouldUpdateZoom(instance, zoom)) {
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
