<script lang="ts" setup>
  /**
   * `BaseCard` — Card component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import BaseCardBody from './base-card-body.vue';
  import BaseCardFooter from './base-card-footer.vue';
  import BaseCardHeader from './base-card-header.vue';

  export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

  withDefaults(
    defineProps<{
      padding?: CardPadding;
      shadow?: boolean;
      bordered?: boolean;
    }>(),
    {
      padding: 'md',
      shadow: false,
      bordered: true,
    },
  );
</script>

<template>
  <article
    :class="[
      'base-card',
      `base-card--padding-${padding}`,
      { 'base-card--shadow': shadow, 'base-card--bordered': bordered },
    ]"
  >
    <BaseCardHeader v-if="$slots.header">
      <slot name="header" />
    </BaseCardHeader>
    <BaseCardBody>
      <slot />
    </BaseCardBody>
    <BaseCardFooter v-if="$slots.footer">
      <slot name="footer" />
    </BaseCardFooter>
  </article>
</template>

<style lang="scss" scoped>
  /* Component styles live in the `mp.components` cascade layer so unlayered */

  /* application overrides win without specificity battles. */
  @layer mp.components {
    .base-card {
      /* Become an inline-size container so the inner padding responds to the */

      /* card's own width (e.g. in a narrow grid cell) rather than the viewport. */
      container: base-card / inline-size;
      background-color: var(--mp-color-bg-surface);
      border-radius: var(--mp-radius-lg);
      overflow: hidden;

      &--bordered {
        border: 1px solid var(--mp-color-border-default);
      }

      &--shadow {
        box-shadow: var(--mp-shadow-md);
      }

      /* Padding variants — compact by default, wider cards get more breathing room */
      &--padding-none {
        .base-card__header,
        .base-card__body,
        .base-card__footer {
          padding: 0;
        }
      }

      &--padding-sm {
        .base-card__header,
        .base-card__body,
        .base-card__footer {
          padding: var(--mp-spacing-2) var(--mp-spacing-3);

          @container base-card (width >= 30rem) {
            padding: var(--mp-spacing-3) var(--mp-spacing-4);
          }
        }
      }

      &--padding-md {
        .base-card__header,
        .base-card__body,
        .base-card__footer {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);

          @container base-card (width >= 30rem) {
            padding: var(--mp-spacing-4) var(--mp-spacing-6);
          }
        }
      }

      &--padding-lg {
        .base-card__header,
        .base-card__body,
        .base-card__footer {
          padding: var(--mp-spacing-4) var(--mp-spacing-6);

          @container base-card (width >= 30rem) {
            padding: var(--mp-spacing-6) var(--mp-spacing-8);
          }
        }
      }

      &__header {
        border-bottom: 1px solid var(--mp-color-border-default);
      }

      &__body {
        /* typography handled by BaseTypography */
      }

      &__footer {
        border-top: 1px solid var(--mp-color-border-default);
      }
    }
  }
</style>
