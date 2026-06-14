<script lang="ts" setup>
  /**
   * `BaseFormBuilderDropzone` — a thin `@dnd-kit/vue` droppable wrapper.
   *
   * It registers a drop target (the root canvas, a wizard step, or a field
   * set's nested area) and reflects the live drag-over state as a CSS class so
   * the surface can highlight where a dragged field will land. Drop targets use
   * a low {@link CollisionPriority} so that, when the pointer is over an actual
   * field row, the row (a higher-priority sortable) wins and the zone only
   * claims the empty space around the rows.
   *
   * It is an internal building block of {@link BaseFormBuilder}.
   */
  import { useDroppable } from '@dnd-kit/vue';
  import { computed, ref } from 'vue';

  import type { FormBuilderDropData } from './types';

  const props = withDefaults(
    defineProps<{
      /** Globally-unique droppable id. */
      id: string;
      /** The drop payload identifying this target to the drag-end handler. */
      data: FormBuilderDropData;
      /** Whether the zone is disabled (read-only builder). */
      disabled?: boolean;
      /** Whether the zone is currently empty (renders the placeholder state). */
      empty?: boolean;
    }>(),
    {
      disabled: false,
      empty: false,
    },
  );

  /**
   * A deliberately *low* `@dnd-kit` collision priority (matching
   * `CollisionPriority.Low`) so that, when the pointer is over an actual field
   * row, the row (a higher-priority sortable) wins and the zone only claims the
   * empty space around the rows. Expressed as a literal to avoid importing from
   * `@dnd-kit/abstract`, which isn't a direct dependency of this package.
   */
  const DROPZONE_COLLISION_PRIORITY = 1;

  const element = ref<HTMLElement | null>(null);

  const { isDropTarget } = useDroppable({
    id: computed(() => props.id),
    type: 'field',
    accept: 'field',
    data: computed(() => props.data),
    disabled: computed(() => props.disabled),
    collisionPriority: DROPZONE_COLLISION_PRIORITY,
    element,
  });
</script>

<template>
  <div
    ref="element"
    :class="[
      'form-builder-dropzone',
      {
        'form-builder-dropzone--over': isDropTarget,
        'form-builder-dropzone--empty': empty,
      },
    ]"
  >
    <slot :is-drop-target="isDropTarget" />
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-dropzone {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-3);
    border-radius: var(--mp-radius-md);
    transition: background-color 0.15s ease;

    &--empty {
      align-items: center;
      justify-content: center;
      min-height: 7rem;
      padding: var(--mp-spacing-4);
      color: var(--mp-color-text-tertiary);
      text-align: center;
      border: 1px dashed var(--mp-color-border-default);
    }

    &--over {
      background-color: var(--mp-color-primary-muted);
      box-shadow: inset 0 0 0 2px var(--mp-color-primary-default);
    }
  }
</style>
