type __VLS_Props = {
    summary?: string;
    open?: boolean;
    disabled?: boolean;
};
declare var __VLS_1: {}, __VLS_8: {};
type __VLS_Slots = {} & {
    summary?: (props: typeof __VLS_1) => any;
} & {
    default?: (props: typeof __VLS_8) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    toggle: (open: boolean) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onToggle?: ((open: boolean) => any) | undefined;
}>, {
    disabled: boolean;
    summary: string;
    open: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
