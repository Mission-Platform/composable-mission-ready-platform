import { ForgeButton, ForgeModal, type ModalSize } from '@mission-platform/components';
import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import {
  ForgeSchemaForm,
  type FormValues,
  type SchemaFormDefinition,
  type SchemaFormValidationMode,
} from '../forge-schema-form';

import styles from './forge-schema-form-dialog.module.scss';

export interface SchemaFormDialogProperties extends MpProperties {
  /**
   * Whether the dialog is open (controlled).
   * @model onUpdateOpen
   */
  open?: boolean;
  /** Title rendered in the dialog header. */
  title?: string;
  /**
   * JSON Schema definition driving both the rendered fields and validation.
   * A single object is a one-step form; an array is a multi-step wizard.
   */
  schema: SchemaFormDefinition;
  /**
   * The current form values (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: FormValues;
  /** Width step of the dialog on tablet/desktop. Defaults to `'md'`. */
  size?: ModalSize;
  /** Label for the confirm/submit button. Defaults to `'Submit'`. */
  submitLabel?: string;
  /** Label for the cancel button (also the header close button). Defaults to `'Cancel'`. */
  cancelLabel?: string;
  /** Disable the whole form and its actions. */
  disabled?: boolean;
  /** Wizard validation strategy (forwarded to the inner form). */
  validationMode?: SchemaFormValidationMode;
  /** Close the dialog when a pointer lands on the backdrop. Defaults to `true`. */
  closeOnBackdrop?: boolean;
  /** Close the dialog when `Escape` is pressed. Defaults to `true`. */
  closeOnEsc?: boolean;
  /** Fired with the next open state (the controlled `update:open`). */
  onUpdateOpen?: (open: boolean) => void;
  /** Fired when the dialog requests to close (backdrop / escape / close button). */
  onClose?: () => void;
  /** Fired with the next full values bag (the controlled `v-model` update). */
  onUpdateModelValue?: (values: FormValues) => void;
  /** Fired with the values bag and validity when the form is submitted. */
  onSubmit?: (values: FormValues, isValid: boolean) => void;
  /** Fired when the cancel button is pressed. */
  onCancel?: () => void;
}

/**
 * `ForgeSchemaFormDialog` — a {@link ForgeSchemaForm} hosted inside a
 * {@link ForgeModal}, authored once in the neutral JSX dialect and compiled
 * straight to React or Vue by `@mission-platform/vite-plugin-forge`.
 *
 * It renders any JSON-Schema-driven form (including a Monaco `code` field) in a
 * centred, controlled modal with Cancel / Submit actions wired to the form's own
 * validation: the primary button is the form's `type="submit"`, so submitting
 * validates through the shared `@mission-platform/forms-core` engine and fires
 * {@link SchemaFormDialogProperties.onSubmit} with the values and validity. Open
 * state is controlled (`open` + `onUpdateOpen`/`onClose`); the caller decides
 * whether to close on a valid submit.
 */
export function ForgeSchemaFormDialog(properties: Readonly<SchemaFormDialogProperties>): MpElement {
  const {
    open = false,
    title,
    schema,
    modelValue,
    size = 'md',
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    disabled = false,
    validationMode = 'per-step',
    closeOnBackdrop = true,
    closeOnEsc = true,
  } = properties;

  const handleCancel = (): void => {
    properties.onCancel?.();
    properties.onUpdateOpen?.(false);
    properties.onClose?.();
  };

  const handleSubmit = (values: FormValues, isValid: boolean): void => {
    properties.onSubmit?.(values, isValid);
  };

  // Re-emit the inner form's value updates as this dialog's own
  // `update:modelValue`. This MUST be a wrapper that *calls*
  // `properties.onUpdateModelValue` rather than forwarding it by reference:
  // `modelValue` is a `@model` prop, so on the Vue build the parent's
  // `onUpdate:modelValue` listener is consumed by the model system and is not
  // available as `properties.onUpdateModelValue` — passing it by reference emits
  // `undefined`, silently dropping every update (e.g. a code-block dialog's
  // language change never reaching its host). A call compiles to the model
  // setter, which correctly forwards the update.
  const handleUpdateModelValue = (values: FormValues): void => {
    properties.onUpdateModelValue?.(values);
  };

  return (
    <ForgeModal
      closeLabel={cancelLabel}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEsc={closeOnEsc}
      open={open}
      size={size}
      title={title}
      onClose={properties.onClose}
      onUpdateOpen={properties.onUpdateOpen}
    >
      <ForgeSchemaForm
        disabled={disabled}
        modelValue={modelValue}
        schema={schema}
        validationMode={validationMode}
        onSubmit={handleSubmit}
        onUpdateModelValue={handleUpdateModelValue}
      >
        <div
          className={styles['forge-schema-form-dialog__actions']}
          slot="actions"
        >
          <ForgeButton
            disabled={disabled}
            type="button"
            variant="secondary"
            onClick={handleCancel}
          >
            {cancelLabel}
          </ForgeButton>
          <ForgeButton
            disabled={disabled}
            type="submit"
            variant="primary"
          >
            {submitLabel}
          </ForgeButton>
        </div>
      </ForgeSchemaForm>
    </ForgeModal>
  );
}
