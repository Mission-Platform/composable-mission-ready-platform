type __VLS_Props = {
    modelValue?: boolean | string[];
    value?: string;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    indeterminate?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: boolean | string[]) => any;
    change: (event: Event) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: boolean | string[]) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
}>, {
    disabled: boolean;
    label: string;
    value: string;
    modelValue: boolean | string[];
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    indeterminate: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
