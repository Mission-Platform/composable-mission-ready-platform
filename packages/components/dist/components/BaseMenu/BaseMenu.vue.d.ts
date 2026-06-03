export interface MenuItem {
    label: string;
    icon?: string;
    disabled?: boolean;
    href?: string;
    to?: string | Record<string, unknown>;
    onClick?: () => void;
    children?: MenuItem[];
}
type __VLS_Props = {
    items: MenuItem[];
    orientation?: 'vertical' | 'horizontal';
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    orientation: "vertical" | "horizontal";
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
