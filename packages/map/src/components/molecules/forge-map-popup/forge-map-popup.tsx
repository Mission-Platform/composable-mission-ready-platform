import { type MpElement, type MpProperties } from '@mission-platform/forge';

import { useMap } from '../../../composables/use-map';
import { usePopup } from '../../../composables/use-popup';

import type { LngLatLike, PopupOptions } from 'maplibre-gl';

export interface MapPopupProperties extends MpProperties {
  /** Longitude/latitude position of the popup. */
  lngLat: LngLatLike;
  /** HTML string displayed inside the popup. */
  content: string;
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

/**
 * `ForgeMapPopup` — adds a MapLibre `Popup` to the nearest `<MapLibre>` ancestor's
 * map. Renders no DOM of its own (the popup lives in the map canvas). Authored
 * once in the neutral JSX dialect.
 */
export function ForgeMapPopup(properties: Readonly<MapPopupProperties>): MpElement | null {
  const map = useMap();
  usePopup(map, {
    lngLat: properties.lngLat,
    content: properties.content,
    isText: properties.isText ?? false,
    open: properties.open ?? true,
    offset: properties.offset,
    className: properties.className,
    closeButton: properties.closeButton ?? true,
    closeOnClick: properties.closeOnClick ?? true,
    anchor: properties.anchor,
    onClose: properties.onClose,
  });

  // Renders no DOM of its own: an empty render is authored as `null`, which the
  // React build emits verbatim (React renders nothing) and the Vue build turns
  // into an empty render that outputs nothing.
  return null;
}
