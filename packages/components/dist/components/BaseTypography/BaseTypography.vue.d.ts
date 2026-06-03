export type TypographyVariant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body-lg' | 'body-md' | 'body-sm' | 'body-xs' | 'label' | 'caption' | 'code';
export type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'inverse' | 'inherit';
export type TypographyAlign = 'start' | 'center' | 'end';
type __VLS_Props = {
    variant?: TypographyVariant;
    as?: string;
    weight?: TypographyWeight;
    color?: TypographyColor;
    align?: TypographyAlign;
    truncate?: boolean;
    truncatePopup?: boolean;
};
declare var __VLS_8: {}, __VLS_23: {}, __VLS_31: {};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_8) => any;
} & {
    default?: (props: typeof __VLS_23) => any;
} & {
    default?: (props: typeof __VLS_31) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    variant: TypographyVariant;
    as: string;
    weight: TypographyWeight;
    color: TypographyColor;
    align: TypographyAlign;
    truncate: boolean;
    truncatePopup: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
