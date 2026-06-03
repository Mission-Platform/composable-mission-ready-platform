type __VLS_Props = {
    title?: string;
    width?: number;
    height?: number;
};
declare function openPopout(): void;
declare function closePopout(): void;
declare var __VLS_1: {}, __VLS_3: {}, __VLS_11: {}, __VLS_19: {}, __VLS_21: {
    isPopped: boolean;
    open: typeof openPopout;
    close: typeof closePopout;
};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_1) => any;
} & {
    placeholder?: (props: typeof __VLS_3) => any;
} & {
    'placeholder-text'?: (props: typeof __VLS_11) => any;
} & {
    default?: (props: typeof __VLS_19) => any;
} & {
    controls?: (props: typeof __VLS_21) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    openPopout: typeof openPopout;
    closePopout: typeof closePopout;
    isPopped: import("vue").Ref<boolean, boolean>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    open: () => any;
    close: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onOpen?: (() => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {
    title: string;
    width: number;
    height: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
