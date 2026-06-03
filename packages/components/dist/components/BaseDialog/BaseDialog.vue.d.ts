type __VLS_Props = {
    open?: boolean;
    title?: string;
    closeOnBackdrop?: boolean;
    closeOnRouteChange?: boolean;
};
declare var __VLS_10: {}, __VLS_18: {}, __VLS_26: {};
type __VLS_Slots = {} & {
    header?: (props: typeof __VLS_10) => any;
} & {
    default?: (props: typeof __VLS_18) => any;
} & {
    footer?: (props: typeof __VLS_26) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:open": (value: boolean) => any;
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:open"?: ((value: boolean) => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {
    title: string;
    open: boolean;
    closeOnBackdrop: boolean;
    closeOnRouteChange: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
