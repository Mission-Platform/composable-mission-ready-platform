// ─── usePopup ─────────────────────────────────────────────────────────────────
//
// Framework-neutral: authored once against the `@mission-platform/jsx` hooks and
// compiled to React / Vue by `@mission-platform/vite-plugin-jsx`.

import { useEffect, useRef, useState } from '@mission-platform/jsx';
import { type LngLatLike, type Map, Popup, type PopupOptions } from 'maplibre-gl';

export interface UsePopupOptions extends PopupOptions {
  /** Longitude/latitude position of the popup. */
  lngLat: LngLatLike;
  /** HTML string or plain text to display inside the popup. */
  content: string;
  /** When `true`, content is treated as plain text (XSS-safe). Defaults to `false`. */
  isText?: boolean;
  /** Whether the popup is currently open. Defaults to `true`. */
  open?: boolean;
  /** Fired when the popup is closed (e.g. via the close button). */
  onClose?: () => void;
}

export interface UsePopupReturn {
  /** The underlying `Popup` instance, or `undefined` before the map is ready. */
  popup: Popup | undefined;
}

/**
 * Creates a MapLibre `Popup` that is automatically added to and removed from the
 * map as the owning component mounts and unmounts. Updates position, content,
 * and open/closed state.
 *
 * @example
 * ```ts
 * const map = useMap();
 * const { popup } = usePopup(map, { lngLat: [-0.12, 51.5], content: '<b>Hi</b>' });
 * ```
 */
export function usePopup(map: Map | undefined, options: UsePopupOptions): UsePopupReturn {
  const { lngLat, content, isText = false, open = true, onClose, ...popupOptions } = options;
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [popup, setPopup] = useState<Popup | undefined>(undefined);
  const popupReference = useRef<Popup | undefined>(undefined);

  useEffect(() => {
    if (!map) {
      return;
    }
    const instance = new Popup(popupOptions);
    if (isText) {
      instance.setText(content);
    } else {
      instance.setHTML(content);
    }
    instance.setLngLat(lngLat);
    if (open) {
      instance.addTo(map);
    }
    if (onClose) {
      instance.on('close', () => onClose());
    }
    popupReference.current = instance;
    setPopup(instance);
    return () => {
      instance.remove();
      popupReference.current = undefined;
      setPopup(undefined);
    };
  }, [map]);

  useEffect(() => {
    popupReference.current?.setLngLat(lngLat);
  }, [lngLat]);

  useEffect(() => {
    const instance = popupReference.current;
    if (!instance) {
      return;
    }
    if (isText) {
      instance.setText(content);
    } else {
      instance.setHTML(content);
    }
  }, [content]);

  useEffect(() => {
    const instance = popupReference.current;
    if (!instance || !map) {
      return;
    }
    if (open) {
      instance.addTo(map);
    } else {
      instance.remove();
    }
  }, [open]);

  return { popup };
}
