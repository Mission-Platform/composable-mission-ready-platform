<script lang="ts" setup>
  /**
   * `BaseQuote` — Blockquote / pull-quote component for the Mission Platform UI.
   *
   * Renders a semantic `<blockquote>` with optional attribution (author and
   * source) and a configurable visual treatment.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, useSlots } from 'vue';

  import BaseTypography from '../base-typography/base-typography.vue';

  /** Visual treatment of the quote. */
  export type QuoteVariant = 'default' | 'bordered' | 'plain';
  /** Size token controlling the quote text scale. */
  export type QuoteSize = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      /** Visual treatment. Defaults to `'default'`. */
      variant?: QuoteVariant;
      /** Text size. Defaults to `'md'`. */
      size?: QuoteSize;
      /** Attribution author name. Rendered in the footer. */
      author?: string;
      /** Attribution source (e.g. a publication or role). Rendered after the author. */
      source?: string;
      /** Native `cite` attribute — a URL pointing to the source of the quotation. */
      cite?: string;
    }>(),
    {
      variant: 'default',
      size: 'md',
      author: undefined,
      source: undefined,
      cite: undefined,
    },
  );

  /**
   * Slots:
   * @slot default — the quotation text.
   * @slot author — custom attribution content (overrides `author`/`source` props).
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
    author?: (props: Record<string, never>) => unknown;
  }>();

  const slots = useSlots();

  const textVariant = computed(() => {
    if (props.size === 'sm') return 'body-md' as const;
    if (props.size === 'lg') return 'h4' as const;
    return 'body-lg' as const;
  });

  const hasAttribution = computed(() => !!slots.author || !!props.author || !!props.source);
</script>

<template>
  <figure :class="['base-quote', `base-quote--${variant}`, `base-quote--${size}`]">
    <blockquote
      :cite="cite"
      class="base-quote__content"
    >
      <BaseTypography
        :variant="textVariant"
        as="p"
        class="base-quote__text"
        color="primary"
      >
        <slot />
      </BaseTypography>
    </blockquote>
    <figcaption
      v-if="hasAttribution"
      class="base-quote__attribution"
    >
      <slot name="author">
        <BaseTypography
          as="span"
          color="secondary"
          variant="body-sm"
          weight="medium"
        >
          {{ author }}
        </BaseTypography>
        <BaseTypography
          v-if="source"
          as="cite"
          class="base-quote__source"
          color="tertiary"
          variant="body-sm"
        >
          {{ source }}
        </BaseTypography>
      </slot>
    </figcaption>
  </figure>
</template>

<style lang="scss" scoped>
  .base-quote {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--mp-spacing-3);

    &__content {
      margin: 0;
    }

    &__text {
      font-style: italic;
    }

    &__attribution {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--mp-spacing-2);

      &::before {
        content: '—';
        color: var(--mp-color-text-tertiary);
      }
    }

    &__source {
      font-style: normal;

      &::before {
        content: ', ';
      }
    }

    /* Variants */
    &--bordered {
      padding-left: var(--mp-spacing-4);
      border-left: 3px solid var(--mp-color-primary-default);
    }

    &--default {
      padding: var(--mp-spacing-5);
      background-color: var(--mp-color-bg-muted);
      border-radius: var(--mp-radius-lg);
    }

    &--plain {
      /* no chrome — text only */
    }
  }
</style>
