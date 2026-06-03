export type ListVariant = 'unordered' | 'ordered' | 'description' | 'none';
export type ListSize = 'sm' | 'md' | 'lg';
export interface ListItem {
    label?: string;
    description?: string;
    term?: string;
    content?: string;
}
type __VLS_Props = {
    items?: ListItem[];
    variant?: ListVariant;
    size?: ListSize;
    divided?: boolean;
};
declare var __VLS_1: {
    item: ListItem;
    index: number;
}, __VLS_15: {}, __VLS_17: {
    item: ListItem;
    index: number;
}, __VLS_25: {}, __VLS_27: {
    item: ListItem;
    index: number;
}, __VLS_35: {}, __VLS_37: {
    item: ListItem;
    index: number;
}, __VLS_45: {};
type __VLS_Slots = {} & {
    item?: (props: typeof __VLS_1) => any;
} & {
    default?: (props: typeof __VLS_15) => any;
} & {
    item?: (props: typeof __VLS_17) => any;
} & {
    default?: (props: typeof __VLS_25) => any;
} & {
    item?: (props: typeof __VLS_27) => any;
} & {
    default?: (props: typeof __VLS_35) => any;
} & {
    item?: (props: typeof __VLS_37) => any;
} & {
    default?: (props: typeof __VLS_45) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    variant: ListVariant;
    size: ListSize;
    items: ListItem[];
    divided: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
