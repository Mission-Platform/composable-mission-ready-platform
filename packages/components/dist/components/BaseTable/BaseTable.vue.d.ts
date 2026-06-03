export type { TableColumn } from './types';
export type { SortDirection } from './types';
import type { TableColumn, SortDirection } from './types';
declare const __VLS_export: <T extends Record<string, unknown>>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<{
        columns: TableColumn<T>[];
        rows: T[];
        caption?: string;
        striped?: boolean;
        bordered?: boolean;
        hoverable?: boolean;
        loading?: boolean;
        emptyText?: string;
    } & {
        onSort?: ((key: string, direction: SortDirection) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: {}) => void;
    attrs: any;
    slots: {
        [x: `cell-${string}`]: ((props: any) => any) | undefined;
    };
    emit: (evt: "sort", key: string, direction: SortDirection) => void;
}>) => import("vue").VNode & {
    __ctx?: Awaited<typeof __VLS_setup>;
};
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_PrettifyLocal<T> = (T extends any ? {
    [K in keyof T]: T[K];
} : {
    [K in keyof T as K]: T[K];
}) & {};
