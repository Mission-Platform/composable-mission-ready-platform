<script lang="ts" setup>
  /**
   * `BaseSwitch` — Switch component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useId } from '../../composables/use-id';
  import BaseStack from '../base-stack/base-stack.vue';
  import BaseTypography from '../base-typography/base-typography.vue';

  export type SwitchSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  const props = withDefaults(
    defineProps<{
      modelValue?: boolean;
      label?: string;
      ariaLabel?: string;
      hint?: string;
      error?: string;
      size?: SwitchSize;
      disabled?: boolean;
      id?: string;
    }>(),
    {
      modelValue: false,
      label: undefined,
      ariaLabel: undefined,
      hint: undefined,
      error: undefined,
      size: 'md',
      disabled: false,
      id: undefined,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    change: [event: Event];
  }>();

  const { id: resolvedId } = useId(props.id);

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.checked);
    emit('change', event);
  }
</script>

<template>
  <BaseStack
    :class="[
      'base-switch',
      `base-switch--${size}`,
      { 'base-switch--error': !!error, 'base-switch--disabled': disabled },
    ]"
    gap="2xs"
  >
    <BaseStack
      align="center"
      as="label"
      class="base-switch__row"
      direction="horizontal"
      gap="xs"
      inline
    >
      <span class="base-switch__track-wrapper">
        <input
          :id="resolvedId"
          :aria-checked="modelValue"
          :aria-describedby="error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined"
          :aria-invalid="!!error || undefined"
          :aria-label="!label ? ariaLabel : undefined"
          :checked="modelValue"
          :disabled="disabled"
          class="base-switch__input"
          role="switch"
          type="checkbox"
          @change="handleChange"
        />
        <span
          aria-hidden="true"
          class="base-switch__track"
        >
          <span class="base-switch__thumb" />
        </span>
      </span>
      <span
        v-if="label"
        class="base-switch__label"
      >
        <BaseTypography
          as="span"
          color="primary"
          variant="body-md"
        >
          {{ label }}
        </BaseTypography>
      </span>
    </BaseStack>
    <BaseTypography
      v-if="error"
      :id="`${resolvedId}-error`"
      as="p"
      class="base-switch__error"
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
      class="base-switch__hint"
      color="secondary"
      variant="caption"
    >
      {{ hint }}
    </BaseTypography>
  </BaseStack>
</template>

<style lang="scss" scoped>
  @use 'sass:list';

  .base-switch {
    &__row {
      cursor: pointer;
    }

    &__track-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    /* Sizes — canonical 2xs → 2xl scale (track / thumb dimensions). */
    @each $size,
      $dims
        in (
          '2xs': (
              24px,
              14px,
              2px,
              10px,
              12px,
            ),
          'xs': (
              28px,
              16px,
              2px,
              12px,
              14px,
            ),
          'sm': (
              32px,
              18px,
              2px,
              14px,
              16px,
            ),
          'md': (
              40px,
              22px,
              2px,
              18px,
              20px,
            ),
          'lg': (
              52px,
              28px,
              3px,
              22px,
              26px,
            ),
          'xl': (
              60px,
              32px,
              3px,
              26px,
              30px,
            ),
          '2xl': (
              72px,
              38px,
              4px,
              30px,
              36px,
            )
        )
    {
      &--#{$size} {
        --thumb-translate: #{list.nth($dims, 5)};

        .base-switch__track {
          width: list.nth($dims, 1);
          height: list.nth($dims, 2);
          padding: list.nth($dims, 3);
        }

        .base-switch__thumb {
          width: list.nth($dims, 4);
          height: list.nth($dims, 4);
        }
      }
    }

    &__label {
      /* typography handled by BaseTypography */
    }

    /* States */
    &--error {
      .base-switch__track {
        outline: 1px solid var(--mp-color-danger-default);
      }
    }

    &__input {
      position: absolute;
      opacity: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      cursor: pointer;

      &:focus-visible ~ .base-switch__track {
        outline: 2px solid var(--mp-color-border-focus);
        outline-offset: 2px;
      }

      &:checked ~ .base-switch__track {
        background-color: var(--mp-color-primary-default);

        .base-switch__thumb {
          transform: translateX(var(--thumb-translate));
        }
      }
    }

    &__track {
      display: flex;
      align-items: center;
      background-color: var(--mp-color-border-default);
      border-radius: var(--mp-radius-full);
      transition: background-color 200ms ease;
      pointer-events: none;
    }

    &__thumb {
      display: block;
      background-color: var(--mp-color-text-on-primary);
      border-radius: 50%;
      box-shadow: var(--mp-shadow-sm);
      transition: transform 200ms ease;
      flex-shrink: 0;
    }

    &--disabled {
      opacity: 0.5;
      pointer-events: none;

      .base-switch__row {
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
