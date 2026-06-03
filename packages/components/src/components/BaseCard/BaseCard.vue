<script setup lang="ts">
  import BaseCardHeader from './BaseCardHeader.vue'
  import BaseCardBody from './BaseCardBody.vue'
  import BaseCardFooter from './BaseCardFooter.vue'

  export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

  withDefaults(
    defineProps<{
      padding?: CardPadding
      shadow?: boolean
      bordered?: boolean
    }>(),
    {
      padding: 'md',
      shadow: false,
      bordered: true,
    },
  )
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

<style scoped lang="scss">
  @use '@mission-platform/breakpoints/scss/mixins' as bp;

  .base-card {
    background-color: var(--mp-color-bg-surface);
    border-radius: var(--mp-radius-lg);
    overflow: hidden;

    &--bordered {
      border: 1px solid var(--mp-color-border-default);
    }

    &--shadow {
      box-shadow: var(--mp-shadow-md);
    }

    // Padding variants — mobile-first, tablet/desktop gets more breathing room
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

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-3) var(--mp-spacing-4);
        }
      }
    }

    &--padding-md {
      .base-card__header,
      .base-card__body,
      .base-card__footer {
        padding: var(--mp-spacing-3) var(--mp-spacing-4);

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-4) var(--mp-spacing-6);
        }
      }
    }

    &--padding-lg {
      .base-card__header,
      .base-card__body,
      .base-card__footer {
        padding: var(--mp-spacing-4) var(--mp-spacing-6);

        @include bp.bp-up('sm') {
          padding: var(--mp-spacing-6) var(--mp-spacing-8);
        }
      }
    }

    &__header {
      border-bottom: 1px solid var(--mp-color-border-default);
    }

    &__body {
      // typography handled by BaseTypography
    }

    &__footer {
      border-top: 1px solid var(--mp-color-border-default);
    }
  }
</style>
