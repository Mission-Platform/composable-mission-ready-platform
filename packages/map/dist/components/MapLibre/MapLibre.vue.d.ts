import { Map, type MapOptions } from 'maplibre-gl';
import type { MapMouseEvent } from 'maplibre-gl';
export interface MapLibreProps {
    /** MapLibre style URL or inline style object. */
    mapStyle: MapOptions['style'];
    /** Initial map center as `[lng, lat]`. Defaults to `[0, 0]`. */
    center?: MapOptions['center'];
    /** Initial zoom level. Defaults to `1`. */
    zoom?: MapOptions['zoom'];
    /** Minimum allowed zoom level. */
    minZoom?: MapOptions['minZoom'];
    /** Maximum allowed zoom level. */
    maxZoom?: MapOptions['maxZoom'];
    /** Initial bearing (rotation) in degrees. Defaults to `0`. */
    bearing?: MapOptions['bearing'];
    /** Initial pitch in degrees. Defaults to `0`. */
    pitch?: MapOptions['pitch'];
    /** Whether to use cooperative gesture handling (requires Ctrl/⌘ + scroll). */
    cooperativeGestures?: MapOptions['cooperativeGestures'];
    /**
     * Attribution control options. Pass `false` to hide it entirely, or an
     * `AttributionControlOptions` object to customise it. Defaults to `undefined`
     * (MapLibre shows the default attribution control).
     */
    attributionControl?: MapOptions['attributionControl'];
}
declare var __VLS_1: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_1) => any;
};
declare const __VLS_base: import("vue").DefineComponent<MapLibreProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    load: (map: Map) => any;
    move: (map: Map) => any;
    click: (event: MapMouseEvent) => any;
    contextmenu: (event: MapMouseEvent) => any;
}, string, import("vue").PublicProps, Readonly<MapLibreProps> & Readonly<{
    onLoad?: ((map: Map) => any) | undefined;
    onMove?: ((map: Map) => any) | undefined;
    onClick?: ((event: MapMouseEvent) => any) | undefined;
    onContextmenu?: ((event: MapMouseEvent) => any) | undefined;
}>, {
    center: import("maplibre-gl").LngLatLike;
    zoom: number;
    minZoom: number | null;
    maxZoom: number | null;
    bearing: number;
    pitch: number;
    cooperativeGestures: boolean;
    attributionControl: false | import("maplibre-gl").AttributionControlOptions;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
