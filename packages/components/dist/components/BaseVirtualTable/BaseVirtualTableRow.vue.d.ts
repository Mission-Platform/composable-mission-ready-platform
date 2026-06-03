import type { TableColumn } from '../BaseTable';
declare const __VLS_export: <T extends Record<string, unknown>>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_exposed?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
    props: import("vue").PublicProps & __VLS_PrettifyLocal<{
        row: T;
        index: number;
        columns: TableColumn<T>[];
        rowHeight: number;
        striped: boolean;
        bordered: boolean;
    } & {
        onRowClick?: ((row: T, index: number) => any) | undefined;
    }> & (typeof globalThis extends {
        __VLS_PROPS_FALLBACK: infer P;
    } ? P : {});
    expose: (exposed: {}) => void;
    attrs: any;
    slots: {
        [key: string]: (props: {
            value: unknown;
            row: T;
            index: number;
        }) => unknown;
    };
    emit: (evt: "rowClick", row: T, index: number) => void;
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
