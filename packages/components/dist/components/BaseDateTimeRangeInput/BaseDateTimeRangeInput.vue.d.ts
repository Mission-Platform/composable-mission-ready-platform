export type DateTimeRangeInputSize = 'sm' | 'md' | 'lg';
export type TimezoneMode = 'browser' | 'utc';
export interface DateTimeRange {
    start: string;
    end: string;
    timezone: TimezoneMode;
}
type __VLS_Props = {
    modelValue?: DateTimeRange;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    size?: DateTimeRangeInputSize;
    showSeconds?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: DateTimeRange) => any;
    change: (value: DateTimeRange) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: DateTimeRange) => any) | undefined;
    onChange?: ((value: DateTimeRange) => any) | undefined;
}>, {
    size: DateTimeRangeInputSize;
    disabled: boolean;
    label: string;
    modelValue: DateTimeRange;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    showSeconds: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
