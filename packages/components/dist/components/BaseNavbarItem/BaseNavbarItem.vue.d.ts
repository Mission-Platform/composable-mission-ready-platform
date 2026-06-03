export type NavbarItemVariant = 'default' | 'primary';
export interface NavbarItemChild {
    label: string;
    href?: string;
    to?: string | Record<string, unknown>;
    disabled?: boolean;
    icon?: string;
    onClick?: () => void;
}
type __VLS_Props = {
    label?: string;
    href?: string;
    to?: string | Record<string, unknown>;
    disabled?: boolean;
    active?: boolean;
    variant?: NavbarItemVariant;
    children?: NavbarItemChild[];
};
declare var __VLS_9: {}, __VLS_11: {}, __VLS_35: {}, __VLS_37: {};
type __VLS_Slots = {} & {
    icon?: (props: typeof __VLS_9) => any;
} & {
    default?: (props: typeof __VLS_11) => any;
} & {
    icon?: (props: typeof __VLS_35) => any;
} & {
    default?: (props: typeof __VLS_37) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    click: (event: MouseEvent) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onClick?: ((event: MouseEvent) => any) | undefined;
}>, {
    variant: NavbarItemVariant;
    disabled: boolean;
    label: string;
    href: string;
    to: string | Record<string, unknown>;
    active: boolean;
    children: NavbarItemChild[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
