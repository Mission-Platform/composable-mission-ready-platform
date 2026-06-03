export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top';
type __VLS_Props = {
    open?: boolean;
    placement?: DropdownPlacement;
    matchTriggerWidth?: boolean;
    maxHeight?: string;
    closeOnOutsideClick?: boolean;
};
declare var __VLS_1: {}, __VLS_9: {};
type __VLS_Slots = {} & {
    trigger?: (props: typeof __VLS_1) => any;
} & {
    default?: (props: typeof __VLS_9) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:open": (value: boolean) => any;
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:open"?: ((value: boolean) => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {
    placement: DropdownPlacement;
    open: boolean;
    matchTriggerWidth: boolean;
    maxHeight: string;
    closeOnOutsideClick: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
