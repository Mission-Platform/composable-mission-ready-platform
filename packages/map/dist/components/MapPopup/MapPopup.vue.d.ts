import type { LngLatLike, PopupOptions } from 'maplibre-gl';
export interface MapPopupProps {
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
}
declare const __VLS_export: import("vue").DefineComponent<MapPopupProps, {
    popup: import("vue").ShallowRef<import("maplibre-gl").Popup | null>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => any;
}, string, import("vue").PublicProps, Readonly<MapPopupProps> & Readonly<{
    onClose?: (() => any) | undefined;
}>, {
    anchor: import("maplibre-gl").PositionAnchor;
    className: string;
    offset: import("maplibre-gl").Offset;
    isText: boolean;
    open: boolean;
    closeButton: boolean;
    closeOnClick: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
