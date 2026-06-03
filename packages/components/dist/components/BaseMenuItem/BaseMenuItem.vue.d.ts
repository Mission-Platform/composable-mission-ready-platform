export type MenuItemVariant = 'default' | 'danger';
type __VLS_Props = {
    label?: string;
    disabled?: boolean;
    variant?: MenuItemVariant;
    icon?: string;
    active?: boolean;
    href?: string;
    to?: string | Record<string, unknown>;
};
declare var __VLS_7: {}, __VLS_9: {}, __VLS_17: {}, __VLS_19: {}, __VLS_27: {}, __VLS_29: {};
type __VLS_Slots = {} & {
    icon?: (props: typeof __VLS_7) => any;
} & {
    default?: (props: typeof __VLS_9) => any;
} & {
    icon?: (props: typeof __VLS_17) => any;
} & {
    default?: (props: typeof __VLS_19) => any;
} & {
    icon?: (props: typeof __VLS_27) => any;
} & {
    default?: (props: typeof __VLS_29) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    click: (event: MouseEvent) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClick?: ((event: MouseEvent) => any) | undefined;
}>, {
    variant: MenuItemVariant;
    disabled: boolean;
    label: string;
    href: string;
    to: string | Record<string, unknown>;
    icon: string;
    active: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
