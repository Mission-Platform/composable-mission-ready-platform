<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/vue'

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
    | 'code'

  export type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold'

  export type TypographyColor =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'disabled'
    | 'inverse'
    | 'inherit'

  export type TypographyAlign = 'start' | 'center' | 'end'

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
  }

  const props = withDefaults(
    defineProps<{
      variant?: TypographyVariant
      as?: string
      weight?: TypographyWeight
      color?: TypographyColor
      align?: TypographyAlign
      truncate?: boolean
      truncatePopup?: boolean
    }>(),
    {
      variant: 'body-md',
      as: undefined,
      weight: undefined,
      color: 'primary',
      align: undefined,
      truncate: false,
      truncatePopup: false,
    },
  )

  const tag = computed(() => props.as ?? TAG_MAP[props.variant ?? 'body-md'])

  // ── Truncate-popup logic ──────────────────────────────────────────────────
  const referenceEl = ref<HTMLElement | null>(null)
  const floatingEl = ref<HTMLElement | null>(null)
  const popupVisible = ref(false)

  const { floatingStyles } = useFloating(referenceEl, floatingEl, {
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  })

  function isOverflowing(): boolean {
    const el = referenceEl.value
    return el ? el.scrollWidth > el.clientWidth : false
  }

  function showPopup() {
    if (props.truncatePopup && isOverflowing()) popupVisible.value = true
  }

  function hidePopup() {
    popupVisible.value = false
  }
</script>

<template>
  <!--
    When truncatePopup is on the root becomes a <span> wrapper so the floating
    popup can be positioned relative to the truncated text element.
    When off the root is the semantic tag itself (no extra DOM node).
  -->
  <component
    v-if="!truncatePopup"
    :is="tag"
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

  <span v-else class="base-typography-popup-wrapper">
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
      @mouseenter="showPopup"
      @mouseleave="hidePopup"
      @focusin="showPopup"
      @focusout="hidePopup"
    >
      <slot />
    </component>
    <Transition name="base-typography-popup-fade">
      <span
        v-if="popupVisible"
        ref="floatingEl"
        class="base-typography-popup"
        role="tooltip"
        :style="floatingStyles"
      >
        <slot />
      </span>
    </Transition>
  </span>
</template>

<style scoped lang="scss">
  @use '@mission-platform/tokens/scss/mixins' as mp;

  .base-typography {
    margin: 0;
    font-family: var(--mp-font-family-sans);
    line-height: var(--mp-line-height-normal);

    // ── Variants ────────────────────────────────────────────────────────────

    &--display {
      @include mp.mp-font-display;
    }

    &--h1 {
      @include mp.mp-font-h1;
    }

    &--h2 {
      @include mp.mp-font-h2;
    }

    &--h3 {
      @include mp.mp-font-h3;
    }

    &--h4 {
      @include mp.mp-font-h4;
    }

    &--h5 {
      @include mp.mp-font-h5;
    }

    &--h6 {
      font-size: var(--mp-font-size-md);
      font-weight: var(--mp-font-weight-medium);
      line-height: var(--mp-line-height-normal);
    }

    &--body-lg {
      @include mp.mp-font-body-lg;
    }

    &--body-md {
      @include mp.mp-font-body-md;
    }

    &--body-sm {
      @include mp.mp-font-body-sm;
    }

    &--body-xs {
      @include mp.mp-font-body-xs;
    }

    &--label {
      @include mp.mp-font-label;
    }

    &--caption {
      @include mp.mp-font-caption;
    }

    &--code {
      @include mp.mp-font-code;
    }

    // ── Weight overrides ─────────────────────────────────────────────────────

    &--weight-regular  { font-weight: var(--mp-font-weight-regular); }
    &--weight-medium   { font-weight: var(--mp-font-weight-medium); }
    &--weight-semibold { font-weight: var(--mp-font-weight-semibold); }
    &--weight-bold     { font-weight: var(--mp-font-weight-bold); }

    // ── Color ────────────────────────────────────────────────────────────────

    &--color-primary   { color: var(--mp-color-text-primary); }
    &--color-secondary { color: var(--mp-color-text-secondary); }
    &--color-tertiary  { color: var(--mp-color-text-tertiary); }
    &--color-disabled  { color: var(--mp-color-text-disabled); }
    &--color-inverse   { color: var(--mp-color-text-inverse); }

    // ── Alignment ────────────────────────────────────────────────────────────

    &--align-start  { text-align: start; }
    &--align-center { text-align: center; }
    &--align-end    { text-align: end; }

    // ── Truncate ─────────────────────────────────────────────────────────────

    &--truncate {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  // ── Truncate-popup wrapper & floating popup ──────────────────────────────

  .base-typography-popup-wrapper {
    display: block;
    min-width: 0;
  }

  .base-typography-popup {
    @include mp.mp-font-body-sm;

    z-index: 700;
    max-width: 480px;
    padding: var(--mp-spacing-2) var(--mp-spacing-3);
    background-color: var(--mp-color-bg-surface);
    color: var(--mp-color-text-primary);
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    box-shadow: var(--mp-shadow-md);
    white-space: normal;
    word-break: break-word;
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
</style>
