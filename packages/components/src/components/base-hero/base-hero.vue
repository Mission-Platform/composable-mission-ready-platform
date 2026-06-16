<script lang="ts" setup>
  /**
   * `BaseHero` — Page hero / banner section for the Mission Platform UI.
   *
   * Renders a prominent banner with an optional eyebrow, title, subtitle,
   * free-form body content, and a row of actions. A `media` slot can be used
   * to render a full-bleed background (e.g. `BaseResponsiveImage` or
   * `BaseBackgroundVideo`) behind the content, with an optional scrim overlay
   * to preserve text contrast.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, useSlots } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  /** Horizontal alignment of the hero content. */
  export type HeroAlign = 'start' | 'center' | 'end';
  /** Vertical padding scale. */
  export type HeroSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** Eyebrow / kicker text rendered above the title. */
      eyebrow?: string;
      /** Hero title. */
      title?: string;
      /** Hero subtitle / supporting copy. */
      subtitle?: string;
      /** Content alignment. Defaults to `'start'`. */
      align?: HeroAlign;
      /** Vertical padding scale. Defaults to `'md'`. */
      size?: HeroSize;
      /** Stretch the hero to fill the viewport height. */
      fullHeight?: boolean;
      /** Darken the `media` background with a scrim to improve text contrast. */
      overlay?: boolean;
      /** Root element tag. Defaults to `'section'`. */
      as?: string;
    }>(),
    {
      eyebrow: undefined,
      title: undefined,
      subtitle: undefined,
      align: 'start',
      size: 'md',
      fullHeight: false,
      overlay: false,
      as: 'section',
    },
  );

  /**
   * Slots:
   * @slot media — full-bleed background content rendered behind the body.
   * @slot eyebrow — overrides the `eyebrow` prop.
   * @slot title — overrides the `title` prop.
   * @slot subtitle — overrides the `subtitle` prop.
   * @slot default — additional body content rendered below the subtitle.
   * @slot actions — a row of calls to action.
   */
  defineSlots<{
    media?: (props: Record<string, never>) => unknown;
    eyebrow?: (props: Record<string, never>) => unknown;
    title?: (props: Record<string, never>) => unknown;
    subtitle?: (props: Record<string, never>) => unknown;
    default?: (props: Record<string, never>) => unknown;
    actions?: (props: Record<string, never>) => unknown;
  }>();

  const slots = useSlots();

  const hasMedia = computed(() => !!slots.media);
  const hasEyebrow = computed(() => !!slots.eyebrow || !!props.eyebrow);
  const hasTitle = computed(() => !!slots.title || !!props.title);
  const hasSubtitle = computed(() => !!slots.subtitle || !!props.subtitle);
  const hasActions = computed(() => !!slots.actions);
</script>

<template>
  <component
    :is="as"
    :class="[
      'base-hero',
      `base-hero--align-${align}`,
      `base-hero--${size}`,
      { 'base-hero--full-height': fullHeight, 'base-hero--has-media': hasMedia, 'base-hero--overlay': overlay },
    ]"
  >
    <div
      v-if="hasMedia"
      class="base-hero__media"
    >
      <slot name="media" />
    </div>
    <div class="base-hero__content">
      <BaseTypography
        v-if="hasEyebrow"
        as="p"
        class="base-hero__eyebrow"
        color="secondary"
        variant="label"
        weight="semibold"
      >
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </BaseTypography>
      <BaseTypography
        v-if="hasTitle"
        as="h1"
        class="base-hero__title"
        color="primary"
        variant="display"
      >
        <slot name="title">{{ title }}</slot>
      </BaseTypography>
      <BaseTypography
        v-if="hasSubtitle"
        as="p"
        class="base-hero__subtitle"
        color="secondary"
        variant="body-lg"
      >
        <slot name="subtitle">{{ subtitle }}</slot>
      </BaseTypography>
      <div
        v-if="$slots.default"
        class="base-hero__body"
      >
        <slot />
      </div>
      <div
        v-if="hasActions"
        class="base-hero__actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </component>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-hero {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      border-radius: var(--mp-radius-xl);
      isolation: isolate;

      &--sm {
        padding: var(--mp-spacing-8) var(--mp-spacing-6);
      }

      &--md {
        padding: var(--mp-spacing-16) var(--mp-spacing-8);
      }

      &--lg {
        padding: var(--mp-spacing-24) var(--mp-spacing-10);
      }

      &--full-height {
        min-height: 100vh;
      }

      &__media {
        position: absolute;
        inset: 0;
        z-index: -2;

        :deep(img),
        :deep(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      &--overlay.base-hero--has-media::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        background-color: var(--mp-color-bg-scrim);
      }

      &__content {
        display: flex;
        flex-direction: column;
        gap: var(--mp-spacing-4);
        max-width: 48rem;
        width: 100%;
      }

      &--align-start &__content {
        align-items: flex-start;
        text-align: start;
        margin-inline: 0 auto;
      }

      &--align-center &__content {
        align-items: center;
        text-align: center;
        margin-inline: auto;
      }

      &--align-end &__content {
        align-items: flex-end;
        text-align: end;
        margin-inline: auto 0;
      }

      &__eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      &__subtitle {
        max-width: 40rem;
      }

      &__actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--mp-spacing-3);
        margin-top: var(--mp-spacing-2);
      }

      &--has-media {
        color: var(--mp-color-text-inverse);

        .base-hero__eyebrow,
        .base-hero__title,
        .base-hero__subtitle {
          color: inherit;
        }
      }
    }
  }
</style>
