export interface RadioOption {
    label: string;
    value: string | number;
    disabled?: boolean;
}
type __VLS_Props = {
    modelValue?: string | number;
    options?: RadioOption[];
    legend?: string;
    legendHidden?: boolean;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    direction?: 'vertical' | 'horizontal';
    name?: string;
};
declare var __VLS_15: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_15) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string | number) => any;
    change: (event: Event) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: string | number) => any) | undefined;
    onChange?: ((event: Event) => any) | undefined;
}>, {
    disabled: boolean;
    legend: string;
    name: string;
    options: RadioOption[];
    modelValue: string | number;
    hint: string;
    error: string;
    required: boolean;
    direction: "vertical" | "horizontal";
    legendHidden: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
