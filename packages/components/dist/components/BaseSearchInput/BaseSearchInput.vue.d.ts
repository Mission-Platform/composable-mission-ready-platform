export type SearchInputSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    modelValue?: string;
    placeholder?: string;
    size?: SearchInputSize;
    disabled?: boolean;
    loading?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    search: (value: string) => any;
    "update:modelValue": (value: string) => any;
    clear: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSearch?: ((value: string) => any) | undefined;
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onClear?: (() => any) | undefined;
}>, {
    size: SearchInputSize;
    disabled: boolean;
    loading: boolean;
    modelValue: string;
    placeholder: string;
    id: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
