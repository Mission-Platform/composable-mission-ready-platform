import type { LayerSpecification } from 'maplibre-gl';
export interface MapLayerProps {
    /** Full MapLibre layer specification. Reactively replaced when changed. */
    layer: LayerSpecification;
    /**
     * ID of an existing layer to insert *before* (i.e. render below that layer).
     * When omitted the layer is drawn on top of all other layers.
     */
    beforeId?: string;
}
declare const __VLS_export: import("vue").DefineComponent<MapLayerProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<MapLayerProps> & Readonly<{}>, {
    beforeId: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
