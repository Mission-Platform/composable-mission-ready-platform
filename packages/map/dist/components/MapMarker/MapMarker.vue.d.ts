import type { LngLatLike, MarkerOptions } from 'maplibre-gl';
export interface MapMarkerProps {
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
}
declare const __VLS_export: import("vue").DefineComponent<MapMarkerProps, {
    marker: import("vue").ShallowRef<import("maplibre-gl").Marker | null>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    dragend: (lngLat: LngLatLike) => any;
}, string, import("vue").PublicProps, Readonly<MapMarkerProps> & Readonly<{
    onDragend?: ((lngLat: LngLatLike) => any) | undefined;
}>, {
    color: string;
    scale: number;
    draggable: boolean;
    rotationAlignment: import("maplibre-gl").Alignment;
    pitchAlignment: import("maplibre-gl").Alignment;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
