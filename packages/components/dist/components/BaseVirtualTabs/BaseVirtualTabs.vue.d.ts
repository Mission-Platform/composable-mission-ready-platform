import type { TabItem, TabsVariant } from '../BaseTabs';
type __VLS_Props = {
    tabs: TabItem[];
    modelValue?: string;
    variant?: TabsVariant;
    closable?: boolean;
    addable?: boolean;
};
declare var __VLS_15: string, __VLS_16: {
    tab: TabItem;
};
type __VLS_Slots = {} & {
    [K in NonNullable<typeof __VLS_15>]?: (props: typeof __VLS_16) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (id: string) => any;
    change: (id: string) => any;
    close: (id: string) => any;
    add: () => any;
    rename: (id: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((id: string) => any) | undefined;
    onChange?: ((id: string) => any) | undefined;
    onClose?: ((id: string) => any) | undefined;
    onAdd?: (() => any) | undefined;
    onRename?: ((id: string) => any) | undefined;
}>, {
    variant: TabsVariant;
    modelValue: string;
    closable: boolean;
    addable: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
