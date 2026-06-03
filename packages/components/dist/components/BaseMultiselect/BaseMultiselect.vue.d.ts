export type MultiselectSize = 'sm' | 'md' | 'lg';
export interface MultiselectOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}
type __VLS_Props = {
    modelValue?: (string | number)[];
    options?: MultiselectOption[];
    size?: MultiselectSize;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: (string | number)[]) => any;
    change: (value: (string | number)[]) => any;
    blur: (event: FocusEvent) => any;
    focus: (event: FocusEvent) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: (string | number)[]) => any) | undefined;
    onChange?: ((value: (string | number)[]) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
}>, {
    size: MultiselectSize;
    disabled: boolean;
    label: string;
    options: MultiselectOption[];
    modelValue: (string | number)[];
    placeholder: string;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
