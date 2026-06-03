import type { MenuItem } from '../BaseMenu/BaseMenu.vue';
export type { MenuItem } from '../BaseMenu/BaseMenu.vue';
declare const _default: typeof __VLS_export;
export default _default;
declare const __VLS_export: __VLS_WithSlots<import("vue").DefineComponent<{
    label?: string;
    bordered?: boolean;
    items?: MenuItem[];
}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{
    label?: string;
    bordered?: boolean;
    items?: MenuItem[];
}> & Readonly<{}>, {
    label: string;
    bordered: boolean;
    items: MenuItem[];
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>, {
    default?: (props: {}) => any;
}>;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
