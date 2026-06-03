import type { StatusLevel } from './types';
type __VLS_Props = {
    statusLevel?: StatusLevel;
};
declare var __VLS_1: {}, __VLS_3: {}, __VLS_5: {}, __VLS_7: {};
type __VLS_Slots = {} & {
    status?: (props: typeof __VLS_1) => any;
} & {
    navbar?: (props: typeof __VLS_3) => any;
} & {
    content?: (props: typeof __VLS_5) => any;
} & {
    footer?: (props: typeof __VLS_7) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{}>, {
    statusLevel: StatusLevel;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
