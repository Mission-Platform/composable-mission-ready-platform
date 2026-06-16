<script lang="ts" setup>
  /**
   * `BaseFieldSet` — a reusable, semantic grouping container.
   *
   * Renders a native `<fieldset>` with an optional `<legend>` and description,
   * giving related controls (or any grouped content) an accessible label and a
   * consistent, token-driven frame. It is intentionally presentation-only and
   * content-agnostic — pass grouped fields, nested field sets, or arbitrary
   * markup through the default slot — so it can be reused anywhere a labelled
   * group is needed (forms, the form builder's nested groups, settings panels,
   * …). Setting `disabled` uses the native `<fieldset disabled>` behaviour,
   * disabling every form control nested inside it.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseStack from '../base-stack/base-stack.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  withDefaults(
    defineProps<{
      /** Legend text labelling the group (overridden by the `legend` slot). */
      legend?: string;
      /** Supporting description shown beneath the legend. */
      description?: string;
      /** Disable every form control nested in the group (native behaviour). */
      disabled?: boolean;
      /** Drop the border/background frame for a borderless group. */
      flush?: boolean;
    }>(),
    {
      legend: undefined,
      description: undefined,
      disabled: false,
      flush: false,
    },
  );
</script>

<template>
  <fieldset
    :class="['base-field-set', { 'base-field-set--flush': flush }]"
    :disabled="disabled || undefined"
  >
    <legend
      v-if="legend || $slots.legend"
      class="base-field-set__legend"
    >
      <BaseTypography
        as="span"
        variant="label"
        weight="semibold"
      >
        <slot name="legend">{{ legend }}</slot>
      </BaseTypography>
    </legend>

    <BaseTypography
      v-if="description"
      as="p"
      class="base-field-set__description"
      color="secondary"
      variant="body-sm"
    >
      {{ description }}
    </BaseTypography>

    <BaseStack
      class="base-field-set__content"
      gap="sm"
    >
      <slot />
    </BaseStack>
  </fieldset>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-field-set {
      min-width: 0;
      padding: var(--mp-spacing-4);
      margin: 0;
      background-color: var(--mp-color-bg-surface);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-lg);

      &--flush {
        padding: 0;
        background-color: transparent;
        border: none;
        border-radius: 0;
      }

      &__legend {
        padding: 0 var(--mp-spacing-1);
      }

      &__description {
        margin: 0 0 var(--mp-spacing-3);
      }
    }
  }
</style>
