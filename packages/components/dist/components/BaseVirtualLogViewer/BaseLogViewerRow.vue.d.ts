import type { LogEntry } from './BaseVirtualLogViewer.vue';
type __VLS_Props = {
    entry: LogEntry;
    index: number;
    itemHeight: number;
    showLevel: boolean;
    showTimestamp: boolean;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    select: (entry: LogEntry) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((entry: LogEntry) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
