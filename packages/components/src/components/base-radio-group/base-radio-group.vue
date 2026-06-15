<script lang="ts" setup>
  /**
   * `BaseRadioGroup` — Radio group component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useI18n } from '@mission-platform/i18n';
  import { computed } from 'vue';

  import BaseRadio from '../base-radio/base-radio.vue';
  import BaseStack from '../base-stack/base-stack.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  export interface RadioOption {
    label: string;
    value: string | number;
    disabled?: boolean;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: string | number;
      options?: RadioOption[];
      legend?: string;
      legendHidden?: boolean;
      hint?: string;
      error?: string;
      disabled?: boolean;
      required?: boolean;
      direction?: 'vertical' | 'horizontal';
      name?: string;
    }>(),
    {
      modelValue: undefined,
      options: () => [],
      legend: undefined,
      legendHidden: false,
      hint: undefined,
      error: undefined,
      disabled: false,
      required: false,
      direction: 'vertical',
      name: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string | number];
    change: [event: Event];
  }>();

  const { t } = useI18n({ useScope: 'local' });
  const groupId = computed(() => props.name ?? `radio-group-${Math.random().toString(36).slice(2, 8)}`);
</script>

<template>
  <fieldset
    :class="['base-radio-group', { 'base-radio-group--error': !!error, 'base-radio-group--disabled': disabled }]"
  >
    <legend
      v-if="legend"
      :class="['base-radio-group__legend', { 'base-radio-group__legend--hidden': legendHidden }]"
    >
      <BaseTypography
        as="span"
        color="primary"
        variant="label"
      >
        {{ legend }}
      </BaseTypography>
      <span
        v-if="required"
        :title="t('required')"
        aria-hidden="true"
        class="base-radio-group__required"
      >
        *
      </span>
    </legend>
    <BaseStack
      :align="direction === 'horizontal' ? 'center' : 'stretch'"
      :class="['base-radio-group__options', `base-radio-group__options--${direction}`]"
      :direction="direction"
      :gap="direction === 'horizontal' ? 'md' : 'xs'"
      :wrap="direction === 'horizontal'"
    >
      <BaseRadio
        v-for="opt in options"
        :id="`${groupId}-${opt.value}`"
        :key="opt.value"
        :disabled="disabled || opt.disabled"
        :label="opt.label"
        :model-value="modelValue"
        :value="opt.value"
        @change="(e) => emit('change', e)"
        @update:model-value="(v) => emit('update:modelValue', v)"
      />
      <slot />
    </BaseStack>
    <BaseTypography
      v-if="error"
      as="p"
      class="base-radio-group__error"
      color="inherit"
      role="alert"
      variant="caption"
    >
      {{ error }}
    </BaseTypography>
    <BaseTypography
      v-else-if="hint"
      as="p"
      class="base-radio-group__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </fieldset>
</template>

<style lang="scss" scoped>
  .base-radio-group {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-2);

    &__legend {
      padding: 0;
      margin-bottom: var(--mp-spacing-1);

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

    &--disabled {
      pointer-events: none;
      color: var(--mp-color-text-disabled);
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
</i18n>
