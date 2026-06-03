export interface WizardStep {
    id: string;
    title: string;
    description?: string;
}
type __VLS_Props = {
    steps: WizardStep[];
    modelValue?: number;
    linear?: boolean;
};
declare var __VLS_14: {
    step: WizardStep;
    index: number;
}, __VLS_17: string, __VLS_18: {
    step: WizardStep;
    index: number;
}, __VLS_30: {
    currentIndex: number;
    prev: () => void;
    next: () => void;
    isFirst: boolean;
    isLast: boolean;
};
type __VLS_Slots = {} & {
    [K in NonNullable<typeof __VLS_17>]?: (props: typeof __VLS_18) => any;
} & {
    default?: (props: typeof __VLS_14) => any;
} & {
    footer?: (props: typeof __VLS_30) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (index: number) => any;
    next: (index: number) => any;
    complete: () => any;
    prev: (index: number) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((index: number) => any) | undefined;
    onNext?: ((index: number) => any) | undefined;
    onComplete?: (() => any) | undefined;
    onPrev?: ((index: number) => any) | undefined;
}>, {
    modelValue: number;
    linear: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
