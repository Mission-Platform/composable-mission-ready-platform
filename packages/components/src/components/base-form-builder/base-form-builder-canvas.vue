<script lang="ts" setup>
  /**
   * `BaseFormBuilderCanvas` — the **Editor** tab surface.
   *
   * Renders the working field tree as a drop target. In single-step mode it is
   * one sortable list; in wizard mode it splits into one labelled section per
   * step, each its own sortable list and drop target, so a field's step is set
   * simply by dropping it into the matching section. Every field row is a
   * recursive {@link BaseFormBuilderField}. It is a thin, presentation-only view
   * over {@link BaseFormBuilder}'s state.
   */
  import { computed } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseFormBuilderDropzone from './base-form-builder-dropzone.vue';
  import BaseFormBuilderField from './base-form-builder-field.vue';
  import { CANVAS_GROUP, canvasStepGroup } from './types';

  import type { BuilderField } from './types';

  const props = withDefaults(
    defineProps<{
      /**
       * The working field tree. In wizard mode this is a per-step matrix
       * (`BuilderField[][]`, one inner list per step); otherwise it is the flat
       * top-level list (`BuilderField[]`).
       */
      fields: BuilderField[] | BuilderField[][];
      /** Id of the currently selected field. */
      selectedId?: string;
      /** Whether the canvas is disabled (read-only builder). */
      disabled?: boolean;
      /** Whether the builder is in wizard mode (renders per-step sections). */
      wizard?: boolean;
      /** Per-step titles (wizard mode). */
      stepTitles?: string[];
      /** Localised type-chip labels, keyed by field type. */
      typeLabels?: Record<string, string>;
    }>(),
    {
      selectedId: undefined,
      disabled: false,
      wizard: false,
      stepTitles: () => [],
      typeLabels: () => ({}),
    },
  );

  const emit = defineEmits<{
    /** A field row was selected. */
    select: [id: string];
    /** Request to remove a field. */
    remove: [id: string];
    /** Request to duplicate a field. */
    duplicate: [id: string];
    /** Request to move a field up within its container. */
    'move-up': [id: string];
    /** Request to move a field down within its container. */
    'move-down': [id: string];
    /** Request to add a child field to the field set with the given id. */
    'add-child': [parentId: string];
  }>();

  /** The root field lists, one per wizard step (single list in single-step mode). */
  const stepLists = computed<BuilderField[][]>(() =>
    props.wizard ? (props.fields as BuilderField[][]) : [props.fields as BuilderField[]],
  );

  /** The flat top-level list, used by the single-step canvas. */
  const rootFields = computed<BuilderField[]>(() => stepLists.value[0] ?? []);

  /** Each rendered wizard step, with the fields assigned to it. */
  const steps = computed(() =>
    stepLists.value.map((list, step) => ({
      step,
      title: props.stepTitles[step] ?? '',
      group: canvasStepGroup(step),
      fields: list,
    })),
  );
</script>

<template>
  <!-- Single-step form: one flat sortable list. -->
  <BaseFormBuilderDropzone
    v-if="!wizard"
    id="form-builder-dropzone-canvas"
    :data="{ kind: 'canvas' }"
    :disabled="disabled"
    :empty="rootFields.length === 0"
    :role="rootFields.length === 0 ? undefined : 'list'"
    class="form-builder-canvas"
  >
    <template v-if="rootFields.length === 0">
      <BaseTypography
        as="span"
        variant="body-sm"
      >
        Drag a field here from the palette to start building your form.
      </BaseTypography>
    </template>

    <BaseFormBuilderField
      v-for="(field, index) in rootFields"
      :key="field.id"
      :disabled="disabled"
      :field="field"
      :group="CANVAS_GROUP"
      :index="index"
      :selected-id="selectedId"
      :sibling-count="rootFields.length"
      :type-labels="typeLabels"
      :wizard="wizard"
      @duplicate="emit('duplicate', $event)"
      @remove="emit('remove', $event)"
      @select="emit('select', $event)"
      @add-child="emit('add-child', $event)"
      @move-down="emit('move-down', $event)"
      @move-up="emit('move-up', $event)"
    />
  </BaseFormBuilderDropzone>

  <!-- Wizard: one labelled, sortable section per step. -->
  <div
    v-else
    class="form-builder-canvas form-builder-canvas--wizard"
  >
    <section
      v-for="entry in steps"
      :key="entry.step"
      class="form-builder-canvas__step"
    >
      <BaseTypography
        as="h3"
        class="form-builder-canvas__step-title"
        variant="label"
        weight="semibold"
      >
        Step {{ entry.step + 1 }}
        <template v-if="entry.title">— {{ entry.title }}</template>
      </BaseTypography>

      <BaseFormBuilderDropzone
        :id="`form-builder-dropzone-step:${entry.step}`"
        :data="{ kind: 'step', step: entry.step }"
        :disabled="disabled"
        :empty="entry.fields.length === 0"
        :role="entry.fields.length === 0 ? undefined : 'list'"
      >
        <template v-if="entry.fields.length === 0">
          <BaseTypography
            as="span"
            variant="body-sm"
          >
            Drop fields here to add them to step {{ entry.step + 1 }}.
          </BaseTypography>
        </template>

        <BaseFormBuilderField
          v-for="(field, index) in entry.fields"
          :key="field.id"
          :disabled="disabled"
          :field="field"
          :group="entry.group"
          :index="index"
          :selected-id="selectedId"
          :sibling-count="entry.fields.length"
          :step="entry.step"
          :type-labels="typeLabels"
          :wizard="wizard"
          @duplicate="emit('duplicate', $event)"
          @remove="emit('remove', $event)"
          @select="emit('select', $event)"
          @add-child="emit('add-child', $event)"
          @move-down="emit('move-down', $event)"
          @move-up="emit('move-up', $event)"
        />
      </BaseFormBuilderDropzone>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .form-builder-canvas {
      min-height: 100%;

      &--wizard {
        display: flex;
        flex-direction: column;
        gap: var(--mp-spacing-4);
      }

      &__step {
        display: flex;
        flex-direction: column;
        gap: var(--mp-spacing-2);
      }

      &__step-title {
        margin: 0;
      }
    }
  }
</style>
