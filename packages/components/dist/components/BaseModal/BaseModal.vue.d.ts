export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type __VLS_Props = {
    open?: boolean;
    title?: string;
    size?: ModalSize;
    closeOnBackdrop?: boolean;
    closeOnEsc?: boolean;
    closeOnRouteChange?: boolean;
};
declare var __VLS_28: {}, __VLS_36: {}, __VLS_44: {};
type __VLS_Slots = {} & {
    header?: (props: typeof __VLS_28) => any;
} & {
    default?: (props: typeof __VLS_36) => any;
} & {
    footer?: (props: typeof __VLS_44) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:open": (value: boolean) => any;
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:open"?: ((value: boolean) => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {
    size: ModalSize;
    title: string;
    open: boolean;
    closeOnBackdrop: boolean;
    closeOnRouteChange: boolean;
    closeOnEsc: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
