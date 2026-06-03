export type CalendarSize = 'sm' | 'md' | 'lg';
type __VLS_Props = {
    /** ISO date string (YYYY-MM-DD) – the selected date. */
    modelValue?: string;
    /** Earliest selectable ISO date (YYYY-MM-DD). */
    min?: string;
    /** Latest selectable ISO date (YYYY-MM-DD). */
    max?: string;
    /** Array of ISO date strings (YYYY-MM-DD) that should be un-selectable. */
    disabledDates?: string[];
    /** Visual size of the calendar. */
    size?: CalendarSize;
    /** IANA timezone string used for rendering (e.g. "America/New_York"). Defaults to the local timezone. */
    timezone?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (value: string) => any;
    change: (value: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:modelValue"?: ((value: string) => any) | undefined;
    onChange?: ((value: string) => any) | undefined;
}>, {
    size: CalendarSize;
    modelValue: string;
    max: string;
    min: string;
    disabledDates: string[];
    timezone: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
