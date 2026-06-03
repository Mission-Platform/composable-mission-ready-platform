export type SortDirection = 'asc' | 'desc' | null;
type __VLS_Props = {
    size?: number | string;
    color?: string;
    ariaLabel?: string;
    active?: boolean;
    direction?: SortDirection;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    size: number | string;
    color: string;
    direction: SortDirection;
    ariaLabel: string;
    active: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
