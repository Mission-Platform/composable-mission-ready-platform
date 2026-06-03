export type TagSize = 'sm' | 'md';
export type TagVariant = 'neutral' | 'primary';
type __VLS_Props = {
    label: string;
    size?: TagSize;
    variant?: TagVariant;
    disabled?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    remove: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onRemove?: (() => any) | undefined;
}>, {
    variant: TagVariant;
    size: TagSize;
    disabled: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
