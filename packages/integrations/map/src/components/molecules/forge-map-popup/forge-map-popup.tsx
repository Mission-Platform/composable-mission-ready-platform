import { useMap, usePopup } from '@/composables';

import type { MpElement } from '@mission-platform/forge-jsx';
import type { LngLatLike, PopupOptions } from 'maplibre-gl';

export interface MapPopupProperties {
  /** Longitude/latitude position of the popup. */
  lngLat?: LngLatLike;
  /** Alias for lngLat position of the popup. */
  coordinates?: LngLatLike;
  /** HTML string displayed inside the popup. */
  content?: string;
  /** When `true`, `content` is treated as plain text (XSS-safe). */
  isText?: boolean;
  /** Whether the popup is open. */
  open?: boolean;
  /** Pixel offset relative to the anchor point. */
  offset?: PopupOptions['offset'];
  /** CSS class names to add to the popup container element. */
  className?: PopupOptions['className'];
  /** Whether to render a close button inside the popup. */
  closeButton?: PopupOptions['closeButton'];
  /** Whether clicking outside the popup closes it. */
  closeOnClick?: PopupOptions['closeOnClick'];
  /** Popup anchor position relative to `lngLat`. */
  anchor?: PopupOptions['anchor'];
  /** Fired when the popup is closed (e.g. via the close button). */
  onClose?: () => void;
}

/** Resolves coordinates from either lngLat or coordinates property. */
function resolvePopupCoordinates(properties: Readonly<MapPopupProperties>): LngLatLike {
  return properties.lngLat ?? properties.coordinates ?? [0, 0];
}

/** Resolves popup options with sensible fallback values. */
function resolvePopupOptions(properties: Readonly<MapPopupProperties>): Parameters<typeof usePopup>[1] {
  const {
    content = '',
    isText = false,
    open = true,
    offset,
    className,
    closeButton = true,
    closeOnClick = true,
    anchor,
    onClose,
  } = properties;

  return {
    lngLat: resolvePopupCoordinates(properties),
    content,
    isText,
    open,
    offset,
    className,
    closeButton,
    closeOnClick,
    anchor,
    onClose,
  };
}

/**
 * `ForgeMapPopup` — adds a MapLibre `Popup` to the nearest `<MapLibre>` ancestor's
 * map. Renders no DOM of its own (the popup lives in the map canvas). Authored
 * once in the neutral JSX dialect.
 */
export function ForgeMapPopup(properties: Readonly<MapPopupProperties>): MpElement | null {
  const map = useMap();
  usePopup(map, resolvePopupOptions(properties));

  // Renders no DOM of its own: an empty render is authored as `null`, which the
  // React build emits verbatim (React renders nothing) and the Vue build turns
  // into an empty render that outputs nothing.
  return null;
}
