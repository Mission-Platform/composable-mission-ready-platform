export type MarkdownInputSize = 'sm' | 'md' | 'lg';
export type MarkdownInputTab = 'write' | 'preview';
type __VLS_Props = {
    modelValue?: string;
    rows?: number;
    size?: MarkdownInputSize;
    placeholder?: string;
    label?: string;
    labelHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string) => any;
    change: (event: Event) => any;
    blur: (event: FocusEvent) => any;
    focus: (event: FocusEvent) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
    onBlur?: ((event: FocusEvent) => any) | undefined;
    onFocus?: ((event: FocusEvent) => any) | undefined;
}>, {
    size: MarkdownInputSize;
    disabled: boolean;
    label: string;
    modelValue: string;
    placeholder: string;
    labelHidden: boolean;
    hint: string;
    error: string;
    required: boolean;
    id: string;
    rows: number;
    readonly: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
