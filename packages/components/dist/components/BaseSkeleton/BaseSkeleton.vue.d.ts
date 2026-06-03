export type SkeletonShape = 'line' | 'circle' | 'block';
type __VLS_Props = {
    shape?: SkeletonShape;
    width?: string;
    height?: string;
    animated?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    width: string;
    height: string;
    shape: SkeletonShape;
    animated: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
