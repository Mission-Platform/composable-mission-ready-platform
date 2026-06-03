type __VLS_Props = {
    modelValue?: File | File[] | null;
    multiple?: boolean;
    accept?: string;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    dragDrop?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: File | File[] | null) => any;
    change: (files: FileList | null) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: File | File[] | null) => any) | undefined;
    onChange?: ((files: FileList | null) => any) | undefined;
}>, {
    disabled: boolean;
    label: string;
    modelValue: File | File[] | null;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    multiple: boolean;
    accept: string;
    dragDrop: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
