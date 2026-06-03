import type { TabItem, TabsVariant } from './BaseTabs.vue';
type __VLS_Props = {
    tabs: TabItem[];
    activeId: string;
    variant: TabsVariant;
    closable?: boolean;
    addable?: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    select: (id: string) => any;
    close: (id: string) => any;
    keydown: (event: KeyboardEvent, id: string) => any;
    add: () => any;
    rename: (id: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((id: string) => any) | undefined;
    onClose?: ((id: string) => any) | undefined;
    onKeydown?: ((event: KeyboardEvent, id: string) => any) | undefined;
    onAdd?: (() => any) | undefined;
    onRename?: ((id: string) => any) | undefined;
}>, {
    closable: boolean;
    addable: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
