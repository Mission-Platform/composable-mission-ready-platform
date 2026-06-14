<script lang="ts" setup>
  /**
   * `BaseFormBuilderPaletteItem` — one draggable entry in the field palette.
   *
   * Each entry is a `@dnd-kit/vue` draggable carrying a
   * `{ kind: 'palette', fieldType }` payload; dragging it onto the canvas adds a
   * new field of that type. Clicking (or pressing Enter / Space) is an
   * accessible fallback that appends the same field without a drag.
   *
   * It is an internal building block of {@link BaseFormBuilder}.
   */
  import { useDraggable } from '@dnd-kit/vue';
  import { IconPlus } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  import type { FieldTypeDescriptor, FormBuilderDragData, FormFieldType } from './types';

  const props = withDefaults(
    defineProps<{
      /** The field type this entry creates. */
      descriptor: FieldTypeDescriptor;
      /** Whether the palette is disabled (read-only builder). */
      disabled?: boolean;
    }>(),
    {
      disabled: false,
    },
  );

  const emit = defineEmits<{
    /** Append a field of this type (the click / keyboard fallback). */
    add: [type: FormFieldType];
  }>();

  const element = ref<HTMLElement | null>(null);

  const { isDragging } = useDraggable({
    id: computed(() => `form-builder-palette:${props.descriptor.type}`),
    type: 'field',
    data: computed<FormBuilderDragData>(() => ({ kind: 'palette', fieldType: props.descriptor.type })),
    disabled: computed(() => props.disabled),
    element,
  });
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="element"
    :aria-disabled="disabled ? 'true' : undefined"
    :class="['form-builder-palette-item', { 'form-builder-palette-item--dragging': isDragging }]"
    role="button"
    tabindex="0"
    @click="!disabled && emit('add', descriptor.type)"
    @keydown.enter.prevent="!disabled && emit('add', descriptor.type)"
    @keydown.space.prevent="!disabled && emit('add', descriptor.type)"
  >
    <span class="form-builder-palette-item__body">
      <BaseTypography
        as="span"
        class="form-builder-palette-item__label"
        variant="label"
      >
        {{ descriptor.label }}
      </BaseTypography>
      <BaseTypography
        v-if="descriptor.description"
        as="span"
        color="secondary"
        variant="body-sm"
      >
        {{ descriptor.description }}
      </BaseTypography>
    </span>
    <IconPlus
      aria-hidden="true"
      class="form-builder-palette-item__icon"
      size="sm"
    />
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-palette-item {
    display: flex;
    gap: var(--mp-spacing-2);
    align-items: center;
    justify-content: space-between;
    padding: var(--mp-spacing-3);
    cursor: grab;
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: var(--mp-color-primary-default);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &:active {
      cursor: grabbing;
    }

    &--dragging {
      opacity: 0.5;
    }

    &[aria-disabled='true'] {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-1);
      min-width: 0;
    }

    &__icon {
      flex-shrink: 0;
      color: var(--mp-color-text-tertiary);
    }
  }
</style>
