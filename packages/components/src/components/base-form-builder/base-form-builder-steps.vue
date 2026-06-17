<script lang="ts" setup>
  /**
   * `BaseFormBuilderSteps` — the **Steps** tab surface, shown only in wizard
   * mode next to the **Editor**.
   *
   * It configures the wizard's list of steps: add / remove a step, and edit each
   * step's title, description, and conditional visibility. Steps are independent
   * of the fields — a field's step is set by dropping it into the matching
   * section on the {@link BaseFormBuilderCanvas}. It is a thin, controlled view:
   * every change is reported through an event so {@link BaseFormBuilder}'s
   * composable stays the single source of truth.
   */
  import { IconPlus, IconTrash } from '@mission-platform/icons';
  import { computed } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseTextarea from '../base-textarea/base-textarea.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  import BaseFormBuilderConditionEditor from './base-form-builder-condition-editor.vue';

  import type { FieldCondition } from './types';

  const props = withDefaults(
    defineProps<{
      /** The number of wizard steps (`≥ 1`). */
      stepCount?: number;
      /** Per-step titles, indexed by step number. */
      stepTitles?: string[];
      /** Per-step descriptions, indexed by step number. */
      stepDescriptions?: string[];
      /** Per-step conditional-visibility rules, indexed by step number. */
      stepConditions?: Array<FieldCondition | undefined>;
      /** Whether the editor is disabled (read-only builder). */
      disabled?: boolean;
    }>(),
    {
      stepCount: 1,
      stepTitles: () => [],
      stepDescriptions: () => [],
      stepConditions: () => [],
      disabled: false,
    },
  );

  const emit = defineEmits<{
    /** Append a new wizard step. */
    'add-step': [];
    /** Remove the wizard step at the given index. */
    'remove-step': [step: number];
    /** A new title for the wizard step at the given index. */
    'update-step-title': [step: number, title: string];
    /** A new description for the wizard step at the given index. */
    'update-step-description': [step: number, description: string];
    /** A new conditional-visibility rule for the wizard step at the given index. */
    'update-step-condition': [step: number, condition: FieldCondition | undefined];
  }>();

  /** A normalised, render-ready descriptor for each wizard step. */
  const steps = computed(() =>
    Array.from({ length: Math.max(1, props.stepCount) }, (_, index) => ({
      index,
      title: props.stepTitles[index] ?? '',
      description: props.stepDescriptions[index] ?? '',
      condition: props.stepConditions[index],
    })),
  );

  const canRemove = computed(() => steps.value.length > 1);
</script>

<template>
  <div class="form-builder-steps">
    <BaseTypography
      as="p"
      class="form-builder-steps__intro"
      color="secondary"
      variant="body-sm"
    >
      Steps are independent of the fields — drop a field into a step section on the canvas to place it there.
    </BaseTypography>

    <section
      v-for="step in steps"
      :key="step.index"
      class="form-builder-steps__step"
    >
      <header class="form-builder-steps__step-header">
        <BaseTypography
          as="h4"
          class="form-builder-steps__step-heading"
          variant="label"
          weight="semibold"
        >
          Step {{ step.index + 1 }}
        </BaseTypography>
        <BaseButton
          :disabled="disabled || !canRemove"
          aria-label="Remove step"
          class="form-builder-steps__remove"
          size="2xs"
          variant="tertiary"
          @click="emit('remove-step', step.index)"
        >
          <IconTrash size="sm" />
        </BaseButton>
      </header>

      <BaseInput
        :disabled="disabled"
        :model-value="step.title"
        :placeholder="`Step ${step.index + 1}`"
        label="Title"
        @update:model-value="emit('update-step-title', step.index, String($event))"
      />
      <BaseTextarea
        :disabled="disabled"
        :model-value="step.description"
        :rows="2"
        hint="Shown as the step's sub-label."
        label="Description"
        @update:model-value="emit('update-step-description', step.index, String($event))"
      />
      <BaseFormBuilderConditionEditor
        :disabled="disabled"
        :legend="`Step ${step.index + 1} visibility`"
        :model-value="step.condition"
        toggle-label="Only show this step when…"
        @update="emit('update-step-condition', step.index, $event)"
      />
    </section>

    <BaseButton
      :disabled="disabled"
      class="form-builder-steps__add"
      size="sm"
      variant="secondary"
      @click="emit('add-step')"
    >
      <IconPlus size="sm" />
      Add step
    </BaseButton>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .form-builder-steps {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-3);
      padding: var(--mp-spacing-3) 0;

      &__intro {
        margin: 0;
      }

      &__step {
        display: flex;
        flex-direction: column;
        gap: var(--mp-spacing-3);
        padding: var(--mp-spacing-3);
        border: 1px solid var(--mp-color-border-default);
        border-radius: var(--mp-radius-md);
      }

      &__step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      &__step-heading {
        margin: 0;
      }

      &__remove {
        padding: var(--mp-spacing-1);
        color: var(--mp-color-text-secondary);

        &:hover:not(:disabled) {
          color: var(--mp-color-danger-text);
          background-color: var(--mp-color-danger-muted);
        }
      }

      &__add {
        align-self: flex-start;
      }
    }
  }
</style>
