export type TimeRangeInputSize = 'sm' | 'md' | 'lg';
export interface TimeRange {
    start: string;
    end: string;
}
type __VLS_Props = {
    modelValue?: TimeRange;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    size?: TimeRangeInputSize;
    showSeconds?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: TimeRange) => any;
    change: (value: TimeRange) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: TimeRange) => any) | undefined;
    onChange?: ((value: TimeRange) => any) | undefined;
}>, {
    size: TimeRangeInputSize;
    disabled: boolean;
    label: string;
    modelValue: TimeRange;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    showSeconds: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
