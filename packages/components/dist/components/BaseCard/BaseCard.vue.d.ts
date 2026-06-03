export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type __VLS_Props = {
    padding?: CardPadding;
    shadow?: boolean;
    bordered?: boolean;
};
declare var __VLS_7: {}, __VLS_15: {}, __VLS_23: {};
type __VLS_Slots = {} & {
    header?: (props: typeof __VLS_7) => any;
} & {
    default?: (props: typeof __VLS_15) => any;
} & {
    footer?: (props: typeof __VLS_23) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    padding: CardPadding;
    shadow: boolean;
    bordered: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
