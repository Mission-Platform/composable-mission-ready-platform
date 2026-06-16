<script lang="ts" setup>
  /**
   * `BaseFormWizardSteps` — Form wizard steps component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { IconCheck } from '@mission-platform/icons';

  import BaseTypography from '../base-typography/base-typography.vue';

  import type { WizardStep } from './base-form-wizard.vue';

  const props = defineProps<{
    steps: WizardStep[];
    currentIndex: number;
    linear: boolean;
  }>();

  const emit = defineEmits<{
    goTo: [index: number];
  }>();

  function stepStatus(index: number): 'complete' | 'current' | 'upcoming' {
    if (index < props.currentIndex) return 'complete';
    if (index === props.currentIndex) return 'current';
    return 'upcoming';
  }
</script>

<template>
  <nav
    aria-label="Progress"
    class="base-form-wizard__steps"
  >
    <ol class="base-form-wizard__step-list">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        :aria-current="index === currentIndex ? 'step' : undefined"
        :class="[
          'base-form-wizard__step',
          `base-form-wizard__step--${stepStatus(index)}`,
          { 'base-form-wizard__step--error': step.error },
        ]"
      >
        <button
          :aria-invalid="step.error ? 'true' : undefined"
          :aria-label="`Step ${index + 1}: ${step.title}`"
          :disabled="linear && index > currentIndex + 1"
          class="base-form-wizard__step-btn"
          type="button"
          @click="emit('goTo', index)"
        >
          <span class="base-form-wizard__step-circle">
            <IconCheck
              v-if="stepStatus(index) === 'complete' && !step.error"
              size="xs"
            />
            <BaseTypography
              v-else
              as="span"
              class="base-form-wizard__step-number"
              color="inherit"
              variant="body-sm"
              weight="semibold"
            >
              {{ index + 1 }}
            </BaseTypography>
          </span>
          <span class="base-form-wizard__step-label">
            <BaseTypography
              as="span"
              class="base-form-wizard__step-title"
              color="primary"
              variant="body-sm"
              weight="medium"
            >
              {{ step.title }}
            </BaseTypography>
            <BaseTypography
              v-if="step.description"
              as="span"
              class="base-form-wizard__step-desc"
              color="secondary"
              variant="caption"
            >
              {{ step.description }}
            </BaseTypography>
          </span>
        </button>
        <div
          v-if="index < steps.length - 1"
          aria-hidden="true"
          class="base-form-wizard__connector"
        />
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-form-wizard__steps {
      width: 100%;
    }

    .base-form-wizard__step-list {
      display: flex;
      align-items: flex-start;
      list-style: none;
      padding: 0;
      margin: 0;
      gap: 0;
    }

    .base-form-wizard__step {
      display: flex;
      align-items: center;
      flex: 1;

      &:last-child {
        flex: 0;
      }
    }

    .base-form-wizard__step-btn {
      display: flex;
      align-items: center;
      gap: var(--mp-spacing-3);
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      text-align: left;
      color: var(--mp-color-text-primary);

      &:disabled {
        cursor: default;
        color: var(--mp-color-text-tertiary);
      }

      &:focus-visible {
        outline: none;
        border-radius: var(--mp-radius-sm);
        box-shadow: var(--mp-shadow-focus-primary);
        color: var(--mp-color-text-primary);
      }
    }

    .base-form-wizard__step-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--mp-radius-full);
      border: 2px solid var(--mp-color-border-default);
      background-color: var(--mp-color-bg-surface);
      flex-shrink: 0;
      transition:
        background-color 150ms ease,
        border-color 150ms ease;
    }

    .base-form-wizard__step--complete .base-form-wizard__step-circle {
      background-color: var(--mp-color-primary-default);
      border-color: var(--mp-color-primary-default);
      color: var(--mp-color-text-on-primary);
    }

    .base-form-wizard__step--current .base-form-wizard__step-circle {
      border-color: var(--mp-color-primary-text);
      color: var(--mp-color-primary-text);
    }

    .base-form-wizard__step-label {
      display: flex;
      flex-direction: column;
    }

    .base-form-wizard__step--upcoming .base-form-wizard__step-title {
      color: var(--mp-color-text-tertiary);
    }

    // Errored steps are highlighted regardless of their complete/current/upcoming
    // status, so these rules intentionally win over the status rules above.
    .base-form-wizard__step--error .base-form-wizard__step-circle {
      background-color: var(--mp-color-bg-surface);
      border-color: var(--mp-color-danger-default);
      color: var(--mp-color-danger-text);
    }

    .base-form-wizard__step--error .base-form-wizard__step-title {
      color: var(--mp-color-danger-text);
    }

    .base-form-wizard__connector {
      flex: 1;
      height: 2px;
      background-color: var(--mp-color-border-default);
      margin: 0 var(--mp-spacing-2);
      align-self: center;
    }

    .base-form-wizard__step--complete + .base-form-wizard__connector {
      background-color: var(--mp-color-primary-default);
    }
  }
</style>
