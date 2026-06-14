<script lang="ts" setup>
  /**
   * `BaseFormBuilderField` — one field row on the builder canvas.
   *
   * Renders a compact summary of a {@link BuilderField} (label, key, type chip,
   * required marker, and — in wizard mode — its step) plus the controls to
   * select, reorder, duplicate, or delete it. The row is a `@dnd-kit/vue`
   * sortable element dragged by its handle, with explicit move-up / move-down
   * buttons as an accessible fallback.
   *
   * When the field is a **field set** the row recursively renders its children
   * inside a nested {@link BaseFormBuilderDropzone}, each child being another
   * `BaseFormBuilderField` in the field set's own sortable group — so authors
   * can build arbitrarily deep groups. It is an internal building block of
   * {@link BaseFormBuilder}.
   */
  import { useSortable } from '@dnd-kit/vue/sortable';
  import { IconChevron, IconCopy, IconMove, IconPlus, IconTrash } from '@mission-platform/icons';
  import { computed, ref } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseFormBuilderDropzone from './base-form-builder-dropzone.vue';
  import { isFieldsetWidget } from './form-schema';
  import { CANVAS_SORTABLE_PLUGINS, canvasGroup } from './types';

  import type { BuilderField, FormBuilderDragData } from './types';

  const props = withDefaults(
    defineProps<{
      /** The field this row represents. */
      field: BuilderField;
      /** The field's position within its container (the sortable index). */
      index: number;
      /** The number of sibling rows in this container (for the move guards). */
      siblingCount: number;
      /** The `@dnd-kit/vue` sortable group of this row's container. */
      group: string;
      /** Id of the currently selected field (highlights the matching row). */
      selectedId?: string;
      /** Whether this row is disabled (read-only builder). */
      disabled?: boolean;
      /** Whether the builder is in wizard mode (shows the step chip). */
      wizard?: boolean;
      /** Zero-based wizard step this row belongs to (drives the step chip). */
      step?: number;
      /** Localised type-chip labels, keyed by field type. */
      typeLabels?: Record<string, string>;
    }>(),
    {
      selectedId: undefined,
      disabled: false,
      wizard: false,
      step: 0,
      typeLabels: () => ({}),
    },
  );

  const emit = defineEmits<{
    /** A row was selected. */
    select: [id: string];
    /** Request to remove a field. */
    remove: [id: string];
    /** Request to duplicate a field. */
    duplicate: [id: string];
    /** Request to move a field one position up within its container. */
    'move-up': [id: string];
    /** Request to move a field one position down within its container. */
    'move-down': [id: string];
    /** Request to add a new child field to the field set with the given id. */
    'add-child': [parentId: string];
  }>();

  const element = ref<HTMLElement | null>(null);
  const handle = ref<HTMLElement | null>(null);
  const row = ref<HTMLElement | null>(null);

  const selected = computed(() => props.field.id === props.selectedId);
  const canMoveUp = computed(() => props.index > 0);
  const canMoveDown = computed(() => props.index < props.siblingCount - 1);
  const typeLabel = computed(() => props.typeLabels[props.field.type] ?? props.field.type);
  const isFieldset = computed(() => isFieldsetWidget(props.field.type));
  const children = computed(() => props.field.children ?? []);
  const childGroup = computed(() => canvasGroup(props.field.id));

  const { isDragging, isDropTarget } = useSortable({
    id: computed(() => props.field.id),
    index: computed(() => props.index),
    group: computed(() => props.group),
    type: 'field',
    data: computed<FormBuilderDragData>(() => ({ kind: 'field', id: props.field.id })),
    disabled: computed(() => props.disabled),
    // Drop dnd-kit's default sortable plugins (chiefly the optimistic-sorting
    // one) so rows don't "jump around" mid-drag — see {@link CANVAS_SORTABLE_PLUGINS}.
    plugins: () => CANVAS_SORTABLE_PLUGINS,
    element,
    handle,
    // Scope this row's *droppable* shape to just its header (`__row`), not the
    // whole card. A field set's card wraps its nested child dropzone, so using
    // the full element made the row's own (Normal-priority) droppable cover —
    // and shadow — the nested (Low-priority) dropzone: dragging a field into a
    // group resolved to the group row itself, dropping the field beside the
    // group instead of inside it (and the overlapping targets made the drop
    // marker flip-flop, so it "bounced"). Limiting the drop shape to the header
    // leaves the nested area owned solely by the child dropzone and child rows,
    // so nesting is deterministic and the jitter is gone.
    target: row,
  });

  /**
   * Whether this row is the live drop target — but not the row being dragged.
   * Drives a steady "insert here" marker that replaces the (removed) live
   * reorder preview, so the landing spot is clear without anything moving.
   */
  const showDropMarker = computed(() => isDropTarget.value && !isDragging.value);
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
  <div
    ref="element"
    :aria-current="selected ? 'true' : undefined"
    :class="[
      'form-builder-field',
      {
        'form-builder-field--selected': selected,
        'form-builder-field--dragging': isDragging,
        'form-builder-field--fieldset': isFieldset,
        'form-builder-field--drop-target': showDropMarker,
      },
    ]"
    role="listitem"
    tabindex="0"
    @click.stop="emit('select', field.id)"
    @keydown.enter.stop="emit('select', field.id)"
  >
    <div
      ref="row"
      class="form-builder-field__row"
    >
      <span
        ref="handle"
        aria-hidden="true"
        class="form-builder-field__handle"
      >
        <IconMove size="sm" />
      </span>

      <div class="form-builder-field__body">
        <BaseTypography
          as="span"
          class="form-builder-field__label"
          variant="label"
        >
          {{ field.label || field.key }}
          <span
            v-if="field.required"
            aria-hidden="true"
            class="form-builder-field__required"
          >
            *
          </span>
        </BaseTypography>
        <span class="form-builder-field__meta">
          <code class="form-builder-field__key">{{ field.key }}</code>
          <span class="form-builder-field__type">{{ typeLabel }}</span>
          <span
            v-if="wizard"
            class="form-builder-field__step"
          >
            Step {{ step + 1 }}
          </span>
        </span>
      </div>

      <div class="form-builder-field__actions">
        <BaseButton
          :disabled="disabled || !canMoveUp"
          aria-label="Move up"
          class="form-builder-field__action"
          size="2xs"
          variant="tertiary"
          @click.stop="emit('move-up', field.id)"
        >
          <IconChevron
            direction="up"
            size="sm"
          />
        </BaseButton>
        <BaseButton
          :disabled="disabled || !canMoveDown"
          aria-label="Move down"
          class="form-builder-field__action"
          size="2xs"
          variant="tertiary"
          @click.stop="emit('move-down', field.id)"
        >
          <IconChevron
            direction="down"
            size="sm"
          />
        </BaseButton>
        <BaseButton
          :disabled="disabled"
          aria-label="Duplicate field"
          class="form-builder-field__action"
          size="2xs"
          variant="tertiary"
          @click.stop="emit('duplicate', field.id)"
        >
          <IconCopy size="sm" />
        </BaseButton>
        <BaseButton
          :disabled="disabled"
          aria-label="Remove field"
          class="form-builder-field__action form-builder-field__action--danger"
          size="2xs"
          variant="tertiary"
          @click.stop="emit('remove', field.id)"
        >
          <IconTrash size="sm" />
        </BaseButton>
      </div>
    </div>

    <!-- Nested field set: drop target + recursively-rendered child rows. -->
    <div
      v-if="isFieldset"
      class="form-builder-field__nested"
    >
      <BaseFormBuilderDropzone
        :id="`form-builder-dropzone-fieldset:${field.id}`"
        :data="{ kind: 'fieldset', id: field.id }"
        :disabled="disabled"
        :empty="children.length === 0"
      >
        <template v-if="children.length === 0">
          <BaseTypography
            as="span"
            color="secondary"
            variant="body-sm"
          >
            Drop fields here to nest them.
          </BaseTypography>
        </template>

        <BaseFormBuilderField
          v-for="(child, childIndex) in children"
          :key="child.id"
          :disabled="disabled"
          :field="child"
          :group="childGroup"
          :index="childIndex"
          :selected-id="selectedId"
          :sibling-count="children.length"
          :step="step"
          :type-labels="typeLabels"
          :wizard="wizard"
          @add-child="emit('add-child', $event)"
          @duplicate="emit('duplicate', $event)"
          @move-down="emit('move-down', $event)"
          @move-up="emit('move-up', $event)"
          @remove="emit('remove', $event)"
          @select="emit('select', $event)"
        />
      </BaseFormBuilderDropzone>

      <BaseButton
        :disabled="disabled"
        class="form-builder-field__add-child"
        size="sm"
        variant="secondary"
        @click.stop="emit('add-child', field.id)"
      >
        <IconPlus size="sm" />
        Add field to group
      </BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .form-builder-field {
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);
    padding: var(--mp-spacing-3);
    background-color: var(--mp-color-bg-surface);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: var(--mp-color-border-strong);
    }

    &:focus-visible {
      outline: none;
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--selected {
      border-color: var(--mp-color-primary-default);
      box-shadow: var(--mp-shadow-focus-primary);
    }

    &--dragging {
      opacity: 0.6;
    }

    // A steady "a field will land here" marker shown while another field is
    // dragged over this row. It replaces dnd-kit's removed live reorder preview
    // with a fixed accent line, so nothing shifts position mid-drag.
    &--drop-target {
      box-shadow: inset 0 3px 0 0 var(--mp-color-primary-default);
    }

    &__row {
      display: flex;
      gap: var(--mp-spacing-3);
      align-items: center;
    }

    &__handle {
      color: var(--mp-color-text-tertiary);
      cursor: grab;
      user-select: none;

      &:active {
        cursor: grabbing;
      }
    }

    &__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--mp-spacing-1);
      min-width: 0;
    }

    &__label {
      display: inline-flex;
      gap: var(--mp-spacing-1);
      align-items: baseline;
    }

    &__required {
      color: var(--mp-color-danger-default);
    }

    &__meta {
      display: flex;
      gap: var(--mp-spacing-2);
      align-items: center;
    }

    &__key {
      font-family: var(--mp-font-family-mono);
      font-size: var(--mp-font-size-xs);
      color: var(--mp-color-text-secondary);
    }

    &__type {
      padding: 0 var(--mp-spacing-2);
      font-size: var(--mp-font-size-2xs);
      color: var(--mp-color-primary-text);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background-color: var(--mp-color-primary-muted);
      border-radius: var(--mp-radius-full);
    }

    &__step {
      padding: 0 var(--mp-spacing-2);
      font-size: var(--mp-font-size-2xs);
      color: var(--mp-color-secondary-text);
      background-color: var(--mp-color-secondary-muted);
      border-radius: var(--mp-radius-full);
    }

    &__actions {
      display: flex;
      gap: var(--mp-spacing-1);
      align-items: center;
    }

    &__action {
      padding: var(--mp-spacing-1);
      color: var(--mp-color-text-secondary);

      &--danger:hover:not(:disabled) {
        color: var(--mp-color-danger-text);
        background-color: var(--mp-color-danger-muted);
      }
    }

    &__nested {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
      padding-left: var(--mp-spacing-4);
      border-left: 2px solid var(--mp-color-border-default);
    }

    &__add-child {
      align-self: flex-start;
    }
  }
</style>
