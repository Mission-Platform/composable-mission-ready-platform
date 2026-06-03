export type InViewAnimation = 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'none';
type __VLS_Props = {
    threshold?: number;
    rootMargin?: string;
    animation?: InViewAnimation;
    duration?: number;
    delay?: number;
    once?: boolean;
    tag?: string;
};
declare var __VLS_9: {
    inView: boolean;
    hasBeenInView: boolean;
};
type __VLS_Slots = {} & {
    default?: (props: typeof __VLS_9) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    inView: import("vue").Ref<boolean, boolean>;
    hasBeenInView: import("vue").Ref<boolean, boolean>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    enter: () => any;
    leave: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onEnter?: (() => any) | undefined;
    onLeave?: (() => any) | undefined;
}>, {
    tag: string;
    duration: number;
    animation: InViewAnimation;
    delay: number;
    threshold: number;
    rootMargin: string;
    once: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
