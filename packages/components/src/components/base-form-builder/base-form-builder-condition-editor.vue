<script lang="ts" setup>
  /**
   * `BaseFormBuilderConditionEditor` — a reusable editor for a single
   * conditional-visibility rule ({@link FieldCondition}).
   *
   * It edits a combinator group (`allOf` / `anyOf` / `oneOf`) of leaf
   * comparisons and reports each change through one `update` event carrying the
   * new condition (or `undefined` when cleared). It backs both a field's
   * `ui.visibleWhen` and a wizard step's `visibleWhen`, so the two share an
   * identical authoring experience. It is an internal building block of
   * {@link BaseFormBuilder}.
   */
  import { IconPlus, IconTrash } from '@mission-platform/icons';
  import { computed } from 'vue';

  import BaseButton from '../base-button/base-button.vue';
  import BaseCheckbox from '../base-checkbox/base-checkbox.vue';
  import BaseInput from '../base-input/base-input.vue';
  import BaseSelect from '../base-select/base-select.vue';

  import type { FieldCondition, FieldConditionLeaf } from './types';

  const props = withDefaults(
    defineProps<{
      /** The condition being edited (`undefined` when no rule is set). */
      modelValue?: FieldCondition;
      /** Whether the editor is disabled (read-only builder). */
      disabled?: boolean;
      /** Legend shown above the editor. */
      legend?: string;
      /** Label on the enable/disable checkbox. */
      toggleLabel?: string;
    }>(),
    {
      modelValue: undefined,
      disabled: false,
      legend: 'Conditional visibility',
      toggleLabel: 'Only show when…',
    },
  );

  const emit = defineEmits<{
    /** The new condition (or `undefined` when the rule is cleared). */
    update: [condition: FieldCondition | undefined];
  }>();

  type Combinator = 'allOf' | 'anyOf' | 'oneOf';

  const CONDITION_OPERATORS = [
    { label: 'equals', value: 'equals' },
    { label: 'does not equal', value: 'notEquals' },
    { label: 'is one of (comma-separated)', value: 'in' },
    { label: 'greater than', value: 'gt' },
    { label: 'less than', value: 'lt' },
    { label: 'is filled', value: 'truthy' },
  ];

  const COMBINATOR_OPTIONS = [
    { label: 'All of (AND)', value: 'allOf' },
    { label: 'Any of (OR)', value: 'anyOf' },
    { label: 'One of (XOR)', value: 'oneOf' },
  ];

  /** The current group's combinator + leaves, normalised for the editor. */
  const currentGroup = computed<{ combinator: Combinator; leaves: FieldConditionLeaf[] }>(() => {
    const condition = props.modelValue;
    if (condition && typeof condition === 'object') {
      for (const key of ['allOf', 'anyOf', 'oneOf'] as Combinator[]) {
        const array = (condition as Record<string, unknown>)[key];
        if (Array.isArray(array)) return { combinator: key, leaves: array as FieldConditionLeaf[] };
      }
    }
    return { combinator: 'allOf', leaves: [] };
  });

  const enabled = computed(() => props.modelValue !== undefined);

  /** Coerces a raw string into a boolean / number / string condition value. */
  function coerce(raw: string): string | number | boolean {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
  }

  /** The operator key currently set on a leaf. */
  function leafOperator(leaf: FieldConditionLeaf): string {
    for (const operator of ['equals', 'notEquals', 'in', 'gt', 'lt', 'truthy']) {
      if (operator in leaf) return operator;
    }
    return 'equals';
  }

  /** The display value for a leaf's comparator. */
  function leafValue(leaf: FieldConditionLeaf): string {
    const operator = leafOperator(leaf) as keyof FieldConditionLeaf;
    const value = leaf[operator];
    if (Array.isArray(value)) return value.join(', ');
    return value === undefined ? '' : String(value);
  }

  /** Builds a leaf from its three editable parts. */
  function buildLeaf(field: string, operator: string, raw: string): FieldConditionLeaf {
    const leaf: FieldConditionLeaf = { field };
    if (operator === 'truthy') {
      leaf.truthy = raw !== 'false';
    } else if (operator === 'in') {
      leaf.in = raw
        .split(',')
        .map((part) => coerce(part.trim()))
        .filter((part) => part !== '');
    } else {
      (leaf as unknown as Record<string, unknown>)[operator] = coerce(raw);
    }
    return leaf;
  }

  /** Persists a new group (or clears the rule when there are no leaves). */
  function emitGroup(combinator: Combinator, leaves: FieldConditionLeaf[]): void {
    emit('update', leaves.length === 0 ? undefined : ({ [combinator]: leaves } as FieldCondition));
  }

  /** Enables the rule (one empty leaf) or clears it entirely. */
  function toggle(on: boolean): void {
    if (on) emitGroup('allOf', [{ field: '', equals: '' }]);
    else emitGroup('allOf', []);
  }

  /** Re-emits the current leaves under a different combinator. */
  function setCombinator(combinator: Combinator): void {
    emitGroup(combinator, currentGroup.value.leaves);
  }

  /** Patches one part (field / operator / value) of the leaf at `index`. */
  function updateLeaf(index: number, part: { field?: string; operator?: string; value?: string }): void {
    const { combinator, leaves } = currentGroup.value;
    const existing = leaves[index];
    const field = part.field ?? existing.field;
    const operator = part.operator ?? leafOperator(existing);
    const value = part.value ?? leafValue(existing);
    emitGroup(
      combinator,
      leaves.map((leaf, i) => (i === index ? buildLeaf(field, operator, value) : leaf)),
    );
  }

  /** Appends a fresh, empty leaf to the current group. */
  function addLeaf(): void {
    const { combinator, leaves } = currentGroup.value;
    emitGroup(combinator, [...leaves, { field: '', equals: '' }]);
  }

  /** Removes the leaf at `index` from the current group. */
  function removeLeaf(index: number): void {
    const { combinator, leaves } = currentGroup.value;
    emitGroup(
      combinator,
      leaves.filter((_, i) => i !== index),
    );
  }
</script>

<template>
  <fieldset class="form-builder-condition-editor">
    <legend class="form-builder-condition-editor__legend">{{ legend }}</legend>
    <BaseCheckbox
      :disabled="disabled"
      :label="toggleLabel"
      :model-value="enabled"
      @update:model-value="toggle(Boolean($event))"
    />
    <template v-if="enabled">
      <BaseSelect
        :disabled="disabled"
        :model-value="currentGroup.combinator"
        :options="COMBINATOR_OPTIONS"
        hint="How the rules below are combined."
        label="Match"
        @update:model-value="setCombinator($event as 'allOf' | 'anyOf' | 'oneOf')"
      />
      <div
        v-for="(leaf, index) in currentGroup.leaves"
        :key="index"
        class="form-builder-condition-editor__rule"
      >
        <BaseInput
          :disabled="disabled"
          :label="`Rule ${index + 1} field`"
          :label-hidden="true"
          :model-value="leaf.field"
          placeholder="Field key"
          @update:model-value="updateLeaf(index, { field: String($event) })"
        />
        <BaseSelect
          :disabled="disabled"
          :label="`Rule ${index + 1} operator`"
          :label-hidden="true"
          :model-value="leafOperator(leaf)"
          :options="CONDITION_OPERATORS"
          @update:model-value="updateLeaf(index, { operator: String($event) })"
        />
        <BaseInput
          :disabled="disabled"
          :label="`Rule ${index + 1} value`"
          :label-hidden="true"
          :model-value="leafValue(leaf)"
          placeholder="Value"
          @update:model-value="updateLeaf(index, { value: String($event) })"
        />
        <BaseButton
          :disabled="disabled"
          aria-label="Remove rule"
          class="form-builder-condition-editor__remove"
          size="2xs"
          variant="tertiary"
          @click="removeLeaf(index)"
        >
          <IconTrash size="sm" />
        </BaseButton>
      </div>
      <BaseButton
        :disabled="disabled"
        class="form-builder-condition-editor__add"
        size="sm"
        variant="secondary"
        @click="addLeaf"
      >
        <IconPlus size="sm" />
        Add rule
      </BaseButton>
    </template>
  </fieldset>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .form-builder-condition-editor {
      display: flex;
      flex-direction: column;
      gap: var(--mp-spacing-2);
      padding: var(--mp-spacing-3);
      margin: 0;
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);

      &__legend {
        padding: 0 var(--mp-spacing-1);
        font-size: var(--mp-font-size-sm);
        font-weight: var(--mp-font-weight-medium);
        color: var(--mp-color-text-secondary);
      }

      &__rule {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr auto;
        gap: var(--mp-spacing-2);
        align-items: center;
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
