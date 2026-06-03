export type StatusLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type StatusIconSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    status?: StatusLevel;
    size?: StatusIconSize;
    label?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    size: StatusIconSize;
    label: string;
    status: StatusLevel;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
