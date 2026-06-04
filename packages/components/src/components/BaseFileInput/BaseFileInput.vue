<script lang="ts" setup>
  import { useI18n } from '@mission-platform/i18n';
  import { IconUpload } from '@mission-platform/icons';
  import { ref } from 'vue';

  import { useId } from '../../composables/use-id';
  import BaseTypography from '../BaseTypography/BaseTypography.vue';

  const props = withDefaults(
    defineProps<{
      modelValue?: File | File[] | null;
      multiple?: boolean;
      accept?: string;
      label?: string;
      labelHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      id?: string;
      dragDrop?: boolean;
    }>(),
    {
      modelValue: null,
      multiple: false,
      accept: undefined,
      label: undefined,
      labelHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      id: undefined,
      dragDrop: false,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: File | File[] | null];
    change: [files: FileList | null];
  }>();

  const { t } = useI18n({ useScope: 'local' });

  const { id: resolvedId } = useId(props.id);
  const isDragging = ref(false);
  const displayName = ref('');

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      emit('update:modelValue', null);
      emit('change', null);
      displayName.value = '';
      return;
    }
    const result = props.multiple ? Array.from(files) : files[0];
    emit('update:modelValue', result);
    emit('change', files);
    displayName.value = props.multiple ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : files[0].name;
  }

  function handleInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    handleFiles(input.files);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging.value = false;
    if (props.disabled) return;
    handleFiles(event.dataTransfer?.files ?? null);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!props.disabled) isDragging.value = true;
  }

  function handleDragLeave() {
    isDragging.value = false;
  }
</script>

<template>
  <div :class="['base-file-input', { 'base-file-input--error': !!error, 'base-file-input--disabled': disabled }]">
    <label
      v-if="label"
      :class="['base-file-input__label', { 'base-file-input__label--hidden': labelHidden }]"
      :for="resolvedId"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >{{ label }}</BaseTypography>
      <span
        v-if="required"
        :title="t('required')"
        aria-hidden="true"
        class="base-file-input__required"
      >*</span>
    </label>

    <div
      v-if="dragDrop"
      :class="['base-file-input__dropzone', { 'base-file-input__dropzone--active': isDragging }]"
      role="presentation"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <IconUpload
        class="base-file-input__icon"
        size="xl"
      />
      <p class="base-file-input__drop-text">
        {{ t('drag') }}
        <label
          :for="resolvedId"
          class="base-file-input__browse-link"
        >{{ t('browse') }}</label>
      </p>
      <p
        v-if="displayName"
        class="base-file-input__file-name"
      >
        {{ displayName }}
      </p>
    </div>

    <div
      v-else
      class="base-file-input__row"
    >
      <label
        :class="{ 'base-file-input__button--disabled': disabled }"
        :for="resolvedId"
        class="base-file-input__button"
      >
        {{ t('browse') }}
      </label>
      <span class="base-file-input__name">{{ displayName || t('noFile') }}</span>
    </div>

    <input
      :id="resolvedId"
      :accept="accept"
      :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
      :aria-invalid="!!error || undefined"
      :disabled="disabled"
      :multiple="multiple"
      :required="required"
      class="base-file-input__native"
      type="file"
      @change="handleInputChange"
    >
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-file-input__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      :id="`${resolvedId}-hint`"
      as="p"
      class="base-file-input__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </div>
</template>

<style lang="scss" scoped>
  .base-file-input {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-1);

    &__label {
      /* typography handled by BaseTypography */

      &--hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }
    }

    &__required {
      color: var(--mp-color-danger-default);
      margin-left: 2px;
    }

    &__native {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    &__row {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-3);
    }

    &__button {
      display: inline-flex;
      align-items: center;
      padding: var(--mp-spacing-2) var(--mp-spacing-4);
      font-size: var(--mp-font-size-sm);
      font-weight: var(--mp-font-weight-medium);
      color: var(--mp-color-text-primary);
      background-color: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color 150ms ease,
        border-color 150ms ease;

      &--disabled {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }

      &:hover:not(&--disabled) {
        background-color: var(--mp-color-bg-muted);
        border-color: var(--mp-color-border-strong);
      }
    }

    &__name {
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--mp-spacing-2);
      padding: var(--mp-spacing-8) var(--mp-spacing-4);
      border: 2px dashed var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);
      background-color: var(--mp-color-bg-surface);
      transition:
        border-color 150ms ease,
        background-color 150ms ease;
      cursor: pointer;
      text-align: center;

      &--active {
        border-color: var(--mp-color-primary-default);
        background-color: var(--mp-color-primary-subtle);
      }
    }

    &__icon {
      color: var(--mp-color-text-tertiary);
    }

    &__drop-text {
      margin: 0;
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-text-secondary);
    }

    &__browse-link {
      color: var(--mp-color-primary-text);
      cursor: pointer;
      font-weight: var(--mp-font-weight-medium);
      text-decoration: underline;

      &:hover {
        color: var(--mp-color-text-primary);
      }
    }

    &__file-name {
      margin: 0;
      font-size: var(--mp-font-size-sm);
      color: var(--mp-color-text-primary);
      font-weight: var(--mp-font-weight-medium);
    }

    &--error {
      .base-file-input__button,
      .base-file-input__dropzone {
        border-color: var(--mp-color-danger-default);
      }
    }

    &--disabled {
      pointer-events: none;

      .base-file-input__label,
      .base-file-input__name,
      .base-file-input__drop-text,
      .base-file-input__file-name {
        color: var(--mp-color-text-disabled);
      }

      .base-file-input__dropzone {
        background-color: var(--mp-color-bg-muted);
        color: var(--mp-color-text-disabled);
        cursor: not-allowed;
      }
    }

    &__error {
      color: var(--mp-color-danger-text);
      margin: 0;
    }

    &__hint {
      margin: 0;
    }
  }
</style>

<i18n lang="yaml">
en:
  required: required
  browse: Browse files
  drag: Drag & drop files here or
  noFile: No file chosen
</i18n>
