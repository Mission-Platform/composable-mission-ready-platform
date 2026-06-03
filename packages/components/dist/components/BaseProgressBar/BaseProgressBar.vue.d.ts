export type ProgressVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info';
export type ProgressSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    value?: number;
    max?: number;
    variant?: ProgressVariant;
    size?: ProgressSize;
    label?: string;
    showLabel?: boolean;
    indeterminate?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    variant: ProgressVariant;
    size: ProgressSize;
    label: string;
    value: number;
    indeterminate: boolean;
    max: number;
    showLabel: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
