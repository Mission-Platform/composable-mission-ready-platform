import type { DrawMode, DrawnFeature } from '../../composables/useDrawing';
export interface MapDrawProps {
    /** Currently active drawing mode. When omitted the tool is in idle/edit mode. */
    mode?: DrawMode;
    /**
     * Pre-existing drawn features to hydrate the tool with (e.g. loaded from a
     * server). Changes to this prop are reflected in the internal state.
     */
    modelValue?: DrawnFeature[];
    /**
     * When `true` (default), move and scale operations use geodesic (ground-accurate)
     * calculations that respect map projection distortion.
     * When `false`, raw lng/lat arithmetic is used — shapes keep their visual
     * appearance on the screen regardless of latitude.
     */
    geodesic?: boolean;
    /** Stroke colour for drawn shapes. */
    strokeColor?: string;
    /** Fill colour for drawn polygon/fill shapes. */
    fillColor?: string;
    /** Fill opacity (0–1). */
    fillOpacity?: number;
    /** Stroke width in pixels. */
    strokeWidth?: number;
    /** Colour for the draft (in-progress) shape. */
    draftColor?: string;
    /** Colour of vertex handle circles. */
    vertexColor?: string;
}
declare var __VLS_93: {
    drawing: import("../../index.ts").UseDrawingReturn;
};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_93) => any;
};
declare const __VLS_base: import("vue").DefineComponent<MapDrawProps, {
    drawing: import("../../index.ts").UseDrawingReturn;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    select: (id: string | null) => any;
    "update:modelValue": (features: DrawnFeature[]) => any;
    "update:mode": (mode: DrawMode) => any;
    "update:geodesic": (geodesic: boolean) => any;
}, string, import("vue").PublicProps, Readonly<MapDrawProps> & Readonly<{
    onSelect?: ((id: string | null) => any) | undefined;
    "onUpdate:modelValue"?: ((features: DrawnFeature[]) => any) | undefined;
    "onUpdate:mode"?: ((mode: DrawMode) => any) | undefined;
    "onUpdate:geodesic"?: ((geodesic: boolean) => any) | undefined;
}>, {
    mode: "circle" | "line" | "polygon" | "square" | "triangle";
    modelValue: DrawnFeature[];
    geodesic: boolean;
    strokeColor: string;
    fillColor: string;
    fillOpacity: number;
    strokeWidth: number;
    draftColor: string;
    vertexColor: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
