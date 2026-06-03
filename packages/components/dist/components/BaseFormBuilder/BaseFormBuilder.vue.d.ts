import type { FormSchema, FormValues } from './types';
export type { FormSchema, FormValues };
export type { FormFieldSchema, FormFieldType, FormErrors } from './types';
type __VLS_Props = {
    schema: FormSchema;
    modelValue?: FormValues;
    disabled?: boolean;
};
declare var __VLS_15: {};
type __VLS_Slots = {} & {
    actions?: (props: typeof __VLS_15) => any;
};
declare const __VLS_base: import("vue").DefineComponent<__VLS_Props, {
    values: FormValues;
    errors: import("./types").FormErrors;
    isValid: import("vue").Ref<boolean, boolean>;
    validate: () => boolean;
    reset: () => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    submit: (values: FormValues, isValid: boolean) => any;
    "update:modelValue": (values: FormValues) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSubmit?: ((values: FormValues, isValid: boolean) => any) | undefined;
    "onUpdate:modelValue"?: ((values: FormValues) => any) | undefined;
}>, {
    disabled: boolean;
    modelValue: FormValues;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
