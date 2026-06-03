export interface TreeNode {
    id: string | number;
    label: string;
    children?: TreeNode[];
    [key: string]: unknown;
}
type __VLS_Props = {
    nodes: TreeNode[];
    defaultOpen?: boolean;
};
type __VLS_Slots = {
    label(props: {
        node: TreeNode;
        depth: number;
    }): unknown;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    select: (node: TreeNode) => any;
    toggle: (node: TreeNode) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((node: TreeNode) => any) | undefined;
    onToggle?: ((node: TreeNode) => any) | undefined;
}>, {
    defaultOpen: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
