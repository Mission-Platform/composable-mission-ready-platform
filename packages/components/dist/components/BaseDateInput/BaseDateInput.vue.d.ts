export type DateInputSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    modelValue?: string;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    size?: DateInputSize;
    min?: string;
    max?: string;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string) => any;
    change: (value: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onChange?: ((value: string) => any) | undefined;
}>, {
    size: DateInputSize;
    disabled: boolean;
    label: string;
    modelValue: string;
    placeholder: string;
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
