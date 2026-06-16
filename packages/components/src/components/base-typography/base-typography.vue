<script lang="ts" setup>
  /**
   * `BaseTypography` — Typography component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
  import { computed, ref } from 'vue';

  import type { AnchorHTMLAttributes } from 'vue';

  export type TypographyVariant =
    | 'display'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'body-lg'
    | 'body-md'
    | 'body-sm'
    | 'body-xs'
    | 'label'
    | 'caption'
    | 'code';

  export type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

  export type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'inverse' | 'inherit';

  export type TypographyAlign = 'start' | 'center' | 'end';

  const props = withDefaults(
    defineProps<
      {
        variant?: TypographyVariant;
        as?: string;
        weight?: TypographyWeight;
        color?: TypographyColor;
        align?: TypographyAlign;
        truncate?: boolean;
        truncatePopup?: boolean;
      } & /* @vue-ignore */ AnchorHTMLAttributes
    >(),
    {
      variant: 'body-md',
      as: undefined,
      weight: undefined,
      color: 'primary',
      align: undefined,
      truncate: false,
      truncatePopup: false,
    },
  );

  const TAG_MAP: Record<TypographyVariant, string> = {
    display: 'h1',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    'body-lg': 'p',
    'body-md': 'p',
    'body-sm': 'p',
    'body-xs': 'p',
    label: 'span',
    caption: 'span',
    code: 'code',
  };

  const tag = computed(() => props.as ?? TAG_MAP[props.variant ?? 'body-md']);

  // ── Truncate-popup logic ──────────────────────────────────────────────────
  const referenceEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);
  const popupVisible = ref(false);

  const { floatingStyles } = useFloating(referenceEl, floatingEl, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });

  function isOverflowing(): boolean {
    const el = referenceEl.value;
    return el ? el.scrollWidth > el.clientWidth : false;
  }

  function showPopup() {
    if (props.truncatePopup && isOverflowing()) popupVisible.value = true;
  }

  function hidePopup() {
    popupVisible.value = false;
  }
</script>

<template>
  <!--
    When truncatePopup is on the root becomes a <span> wrapper so the floating
    popup can be positioned relative to the truncated text element.
    When off the root is the semantic tag itself (no extra DOM node).
  -->
  <component
    :is="tag"
    v-if="!truncatePopup"
    :class="[
      'base-typography',
      `base-typography--${variant}`,
      weight && `base-typography--weight-${weight}`,
      color !== 'inherit' && `base-typography--color-${color}`,
      align && `base-typography--align-${align}`,
      { 'base-typography--truncate': truncate },
    ]"
  >
    <slot />
  </component>

  <span
    v-else
    class="base-typography-popup-wrapper"
  >
    <component
      :is="tag"
      ref="referenceEl"
      :class="[
        'base-typography',
        `base-typography--${variant}`,
        weight && `base-typography--weight-${weight}`,
        color !== 'inherit' && `base-typography--color-${color}`,
        align && `base-typography--align-${align}`,
        'base-typography--truncate',
      ]"
      @focusin="showPopup"
      @focusout="hidePopup"
      @mouseenter="showPopup"
      @mouseleave="hidePopup"
    >
      <slot />
    </component>
    <Transition name="base-typography-popup-fade">
      <span
        v-if="popupVisible"
        ref="floatingEl"
        :style="floatingStyles"
        class="base-typography-popup"
        role="tooltip"
      >
        <slot />
      </span>
    </Transition>
  </span>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    /*
     * Typography variants are composed directly from the generated design-token
     * CSS custom properties (Phase 2: the SCSS `mp-font-*` mixin layer is being
     * retired in favour of the `--mp-*` tokens). Each variant mirrors the values
     * previously produced by the matching `mp.mp-font-*` mixin.
     */
    .base-typography {
      margin: 0;
      font-family: var(--mp-font-family-sans);
      line-height: var(--mp-line-height-normal);

      /* ── Variants ──────────────────────────────────────────────────────────── */

      &--display {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-5xl);
        font-weight: var(--mp-font-weight-bold);
        line-height: var(--mp-line-height-tight);
        letter-spacing: var(--mp-letter-spacing-tight);
      }

      &--h1 {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-4xl);
        font-weight: var(--mp-font-weight-semibold);
        line-height: var(--mp-line-height-tight);
        letter-spacing: var(--mp-letter-spacing-tight);
      }

      &--h2 {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-3xl);
        font-weight: var(--mp-font-weight-semibold);
        line-height: var(--mp-line-height-tight);
        letter-spacing: var(--mp-letter-spacing-tight);
      }

      &--h3 {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-2xl);
        font-weight: var(--mp-font-weight-medium);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-tight);
      }

      &--h4 {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-xl);
        font-weight: var(--mp-font-weight-medium);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-tight);
      }

      &--h5 {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-lg);
        font-weight: var(--mp-font-weight-medium);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      &--h6 {
        font-size: var(--mp-font-size-md);
        font-weight: var(--mp-font-weight-medium);
        line-height: var(--mp-line-height-normal);
      }

      &--body-lg {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-lg);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-relaxed);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      &--body-md {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-md);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-normal);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      &--body-sm {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-sm);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-normal);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      &--body-xs {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-xs);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-wide);
      }

      &--label {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-sm);
        font-weight: var(--mp-font-weight-medium);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      &--caption {
        font-family: var(--mp-font-family-sans);
        font-size: var(--mp-font-size-xs);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-wide);
      }

      &--code {
        font-family: var(--mp-font-family-mono);
        font-size: var(--mp-font-size-sm);
        font-weight: var(--mp-font-weight-regular);
        line-height: var(--mp-line-height-snug);
        letter-spacing: var(--mp-letter-spacing-normal);
      }

      /* ── Weight overrides ───────────────────────────────────────────────────── */

      &--weight-regular {
        font-weight: var(--mp-font-weight-regular);
      }

      &--weight-medium {
        font-weight: var(--mp-font-weight-medium);
      }

      &--weight-semibold {
        font-weight: var(--mp-font-weight-semibold);
      }

      &--weight-bold {
        font-weight: var(--mp-font-weight-bold);
      }

      /* ── Color ──────────────────────────────────────────────────────────────── */

      &--color-primary {
        color: var(--mp-color-text-primary);
      }

      &--color-secondary {
        color: var(--mp-color-text-secondary);
      }

      &--color-tertiary {
        color: var(--mp-color-text-tertiary);
      }

      &--color-disabled {
        color: var(--mp-color-text-disabled);
      }

      &--color-inverse {
        color: var(--mp-color-text-inverse);
      }

      /* ── Alignment ──────────────────────────────────────────────────────────── */

      &--align-start {
        text-align: start;
      }

      &--align-center {
        text-align: center;
      }

      &--align-end {
        text-align: end;
      }

      /* ── Truncate ───────────────────────────────────────────────────────────── */

      &--truncate {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }

    /* ── Truncate-popup wrapper & floating popup ────────────────────────────── */

    .base-typography-popup-wrapper {
      display: block;
      min-width: 0;
    }

    .base-typography-popup {
      font-family: var(--mp-font-family-sans);
      font-size: var(--mp-font-size-sm);
      font-weight: var(--mp-font-weight-regular);
      line-height: var(--mp-line-height-normal);
      letter-spacing: var(--mp-letter-spacing-normal);
      z-index: 700;
      max-width: 480px;
      padding: var(--mp-spacing-2) var(--mp-spacing-3);
      background-color: var(--mp-color-bg-surface);
      color: var(--mp-color-text-primary);
      border: 1px solid var(--mp-color-border-default);
      border-radius: var(--mp-radius-md);
      box-shadow: var(--mp-shadow-md);
      white-space: normal;
      overflow-wrap: break-word;
      pointer-events: none;
    }

    .base-typography-popup-fade-enter-active,
    .base-typography-popup-fade-leave-active {
      transition: opacity 150ms ease;
    }

    .base-typography-popup-fade-enter-from,
    .base-typography-popup-fade-leave-to {
      opacity: 0;
    }
  }
</style>
