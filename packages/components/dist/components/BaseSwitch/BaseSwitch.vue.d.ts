export type SwitchSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    modelValue?: boolean;
    label?: string;
    ariaLabel?: string;
    hint?: string;
    error?: string;
    size?: SwitchSize;
    disabled?: boolean;
    id?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: boolean) => any;
    change: (event: Event) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
}>, {
    size: SwitchSize;
    disabled: boolean;
    label: string;
    modelValue: boolean;
    hint: string;
    error: string;
    id: string;
    ariaLabel: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
