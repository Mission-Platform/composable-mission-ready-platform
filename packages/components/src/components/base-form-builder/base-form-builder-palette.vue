<script lang="ts" setup>
  /**
   * `BaseFormBuilderPalette` — the start-sidebar field palette.
   *
   * Lists the available {@link FieldTypeDescriptor}s as draggable entries. Each
   * entry can be dragged onto the canvas or clicked to append a field. This is
   * a thin, presentation-only component; all state lives in
   * {@link BaseFormBuilder}.
   */
  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseFormBuilderPaletteItem from './base-form-builder-palette-item.vue';

  import type { FieldTypeDescriptor, FormFieldType } from './types';

  withDefaults(
    defineProps<{
      /** The field types to offer. */
      fieldTypes: FieldTypeDescriptor[];
      /** Whether the palette is disabled (read-only builder). */
      disabled?: boolean;
    }>(),
    {
      disabled: false,
    },
  );

  const emit = defineEmits<{
    /** Append a field of the given type (click / keyboard fallback). */
    add: [type: FormFieldType];
  }>();
</script>

<template>
  <div class="form-builder-palette">
    <BaseTypography
      as="h2"
      class="form-builder-palette__title"
      variant="label"
      weight="semibold"
    >
      Fields
    </BaseTypography>
    <BaseTypography
      as="p"
      class="form-builder-palette__hint"
      color="secondary"
      variant="body-sm"
    >
      Drag a field onto the form, or click to append it.
    </BaseTypography>

    <div class="form-builder-palette__list">
      <BaseFormBuilderPaletteItem
        v-for="descriptor in fieldTypes"
        :key="descriptor.type"
        :descriptor="descriptor"
        :disabled="disabled"
        @add="emit('add', $event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-palette {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);

    &__title {
      margin: 0;
    }

    &__hint {
      margin: 0 0 var(--mp-spacing-2);
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
    }
  }
</style>
