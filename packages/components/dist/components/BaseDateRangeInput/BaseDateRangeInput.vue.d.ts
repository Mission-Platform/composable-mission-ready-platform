export type DateRangeInputSize = 'sm' | 'md' | 'lg';
export interface DateRange {
    start: string;
    end: string;
}
type __VLS_Props = {
    modelValue?: DateRange;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    size?: DateRangeInputSize;
    min?: string;
    max?: string;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: DateRange) => any;
    change: (value: DateRange) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: DateRange) => any) | undefined;
    onChange?: ((value: DateRange) => any) | undefined;
}>, {
    size: DateRangeInputSize;
    disabled: boolean;
    label: string;
    modelValue: DateRange;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    max: string;
    min: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
