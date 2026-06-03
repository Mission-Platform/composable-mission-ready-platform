export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogEntry {
    id: string | number;
    level: LogLevel;
    message: string;
    timestamp?: string;
    [key: string]: unknown;
}
type __VLS_Props = {
    entries: LogEntry[];
    itemHeight?: number;
    overscan?: number;
    height?: number;
    showLevel?: boolean;
    showTimestamp?: boolean;
    followTail?: boolean;
    filter?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    select: (entry: LogEntry) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((entry: LogEntry) => any) | undefined;
}>, {
    filter: string;
    height: number;
    itemHeight: number;
    overscan: number;
    showLevel: boolean;
    showTimestamp: boolean;
    followTail: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
