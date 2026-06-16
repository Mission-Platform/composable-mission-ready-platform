<script lang="ts" setup>
  /* eslint-disable vuejs-accessibility/no-static-element-interactions */
  /**
   * `BaseCarousel` — Carousel component for the Mission Platform UI.
   *
   * Displays a horizontally-scrollable list of slides one (or more) at a
   * time, with optional previous/next controls and indicator dots. Each
   * slide is provided via the default slot, typically using the
   * `<BaseCarouselSlide>` helper, but any child element works.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue';

  import { useReducedMotion } from '../../composables/use-reduced-motion';

  const properties = withDefaults(
    defineProps<{
      /** Index of the initially visible slide. */
      modelValue?: number;
      /** Show previous/next navigation controls. */
      controls?: boolean;
      /** Show indicator dots below the carousel. */
      indicators?: boolean;
      /** Allow the index to wrap when navigating past the first/last slide. */
      loop?: boolean;
      /** Accessible label for the carousel region. */
      ariaLabel?: string;
      /** Automatically advance slides at a regular interval. */
      autoplay?: boolean;
      /** Autoplay interval in milliseconds. */
      interval?: number;
      /** Pause autoplay when the pointer hovers or the carousel has keyboard focus. */
      pauseOnHover?: boolean;
      /** Minimum horizontal pointer movement (in px) required to register a swipe. */
      swipeThreshold?: number;
    }>(),
    {
      modelValue: 0,
      controls: true,
      indicators: true,
      loop: true,
      ariaLabel: 'Carousel',
      autoplay: false,
      interval: 5000,
      pauseOnHover: true,
      swipeThreshold: 40,
    },
  );

  const emit = defineEmits<{
    (event: 'update:modelValue', index: number): void;
    (event: 'change', index: number): void;
  }>();

  const internalIndex = ref(properties.modelValue);
  // Sync internal index whenever the parent updates the controlled `modelValue`.
  watch(
    () => properties.modelValue,
    (value) => {
      if (typeof value === 'number') internalIndex.value = value;
    },
  );
  const currentIndex = computed({
    get: () => internalIndex.value,
    set: (value: number) => {
      internalIndex.value = value;
      emit('update:modelValue', value);
      emit('change', value);
    },
  });

  const slots = useSlots();
  const slideCount = computed(() => {
    const defaultSlot = slots.default?.();
    if (!defaultSlot) return 0;
    // Flatten fragments (e.g. v-for emits a single VNode containing children).
    let count = 0;
    for (const node of defaultSlot) {
      if (Array.isArray(node.children)) {
        count += node.children.length;
      } else {
        count += 1;
      }
    }
    return count;
  });

  function goTo(index: number): void {
    if (slideCount.value === 0) return;
    currentIndex.value = properties.loop
      ? ((index % slideCount.value) + slideCount.value) % slideCount.value
      : Math.max(0, Math.min(slideCount.value - 1, index));
  }

  function previous(): void {
    goTo(currentIndex.value - 1);
  }

  function next(): void {
    goTo(currentIndex.value + 1);
  }

  const trackStyle = computed(() => ({
    transform: `translateX(-${currentIndex.value * 100}%)`,
  }));

  // ── Autoplay ────────────────────────────────────────────────────────────────
  let autoplayTimer: ReturnType<typeof setInterval> | null = null;
  // Transient pause from hover / focus.
  const isPaused = ref(false);
  // Explicit pause requested by the user via the pause/play control (WCAG 2.2.2).
  const userPaused = ref(false);
  // Respect the user's reduced-motion preference: never auto-rotate when set.
  const reducedMotion = useReducedMotion();

  function stopAutoplay(): void {
    if (autoplayTimer !== null) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startAutoplay(): void {
    stopAutoplay();
    if (!properties.autoplay || isPaused.value || userPaused.value || reducedMotion.value || slideCount.value <= 1) {
      return;
    }
    autoplayTimer = setInterval(
      () => {
        next();
      },
      Math.max(1000, properties.interval),
    );
  }

  /** Whether the user-facing pause/play control should be shown. */
  const showAutoplayToggle = computed(() => properties.autoplay && slideCount.value > 1 && !reducedMotion.value);

  /** Toggles the explicit, user-controlled autoplay pause (WCAG 2.2.2). */
  function toggleAutoplayPaused(): void {
    userPaused.value = !userPaused.value;
  }

  watch(
    () => [
      properties.autoplay,
      properties.interval,
      isPaused.value,
      userPaused.value,
      reducedMotion.value,
      slideCount.value,
    ],
    () => startAutoplay(),
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopAutoplay();
  });

  function handleMouseEnter(): void {
    if (properties.pauseOnHover) isPaused.value = true;
  }
  function handleMouseLeave(): void {
    if (properties.pauseOnHover) isPaused.value = false;
  }
  function handleFocusIn(): void {
    if (properties.pauseOnHover) isPaused.value = true;
  }
  function handleFocusOut(event: FocusEvent): void {
    if (!properties.pauseOnHover) return;
    const root = event.currentTarget as HTMLElement | null;
    const nextTarget = event.relatedTarget as Node | null;
    if (!root || !nextTarget || !root.contains(nextTarget)) {
      isPaused.value = false;
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  function handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        previous();
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        next();
        break;
      }
      case 'Home': {
        event.preventDefault();
        goTo(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        goTo(slideCount.value - 1);
        break;
      }
      default: {
        break;
      }
    }
  }

  // ── Touch / pointer swipe ───────────────────────────────────────────────────
  const pointerStartX = ref<number | null>(null);
  const pointerStartY = ref<number | null>(null);
  const pointerId = ref<number | null>(null);

  function handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartX.value = event.clientX;
    pointerStartY.value = event.clientY;
    pointerId.value = event.pointerId;
    if (properties.pauseOnHover) isPaused.value = true;
  }

  function handlePointerUp(event: PointerEvent): void {
    if (pointerStartX.value === null || pointerStartY.value === null) return;
    const deltaX = event.clientX - pointerStartX.value;
    const deltaY = event.clientY - pointerStartY.value;
    pointerStartX.value = null;
    pointerStartY.value = null;
    pointerId.value = null;
    if (event.pointerType !== 'mouse' && properties.pauseOnHover) {
      isPaused.value = false;
    }
    // Only treat as a swipe if horizontal movement dominates and exceeds the threshold.
    if (Math.abs(deltaX) < properties.swipeThreshold) return;
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) {
      next();
    } else {
      previous();
    }
  }

  function handlePointerCancel(): void {
    pointerStartX.value = null;
    pointerStartY.value = null;
    pointerId.value = null;
    if (properties.pauseOnHover) isPaused.value = false;
  }

  defineExpose({ previous, next, goTo });
</script>

<template>
  <section
    :aria-label="ariaLabel"
    aria-roledescription="carousel"
    class="base-carousel"
    tabindex="0"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    @keydown="handleKeydown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="base-carousel__viewport"
      @pointercancel="handlePointerCancel"
      @pointerdown="handlePointerDown"
      @pointerleave="handlePointerCancel"
      @pointerup="handlePointerUp"
    >
      <div
        :style="trackStyle"
        class="base-carousel__track"
      >
        <slot />
      </div>
    </div>

    <button
      v-if="controls && slideCount > 1"
      :disabled="!loop && currentIndex === 0"
      aria-label="Previous slide"
      class="base-carousel__control base-carousel__control--prev"
      type="button"
      @click="previous"
    >
      <span aria-hidden="true">‹</span>
    </button>
    <button
      v-if="controls && slideCount > 1"
      :disabled="!loop && currentIndex === slideCount - 1"
      aria-label="Next slide"
      class="base-carousel__control base-carousel__control--next"
      type="button"
      @click="next"
    >
      <span aria-hidden="true">›</span>
    </button>

    <div
      v-if="indicators && slideCount > 1"
      class="base-carousel__indicators"
      role="tablist"
    >
      <button
        v-for="index in slideCount"
        :key="index - 1"
        :aria-label="`Go to slide ${index}`"
        :aria-selected="currentIndex === index - 1"
        :class="['base-carousel__indicator', { 'base-carousel__indicator--active': currentIndex === index - 1 }]"
        role="tab"
        type="button"
        @click="goTo(index - 1)"
      />
    </div>

    <button
      v-if="showAutoplayToggle"
      :aria-label="userPaused ? 'Start automatic slide rotation' : 'Pause automatic slide rotation'"
      :aria-pressed="userPaused"
      class="base-carousel__autoplay"
      type="button"
      @click="toggleAutoplayPaused"
    >
      <span aria-hidden="true">{{ userPaused ? '▶' : '❙❙' }}</span>
    </button>
  </section>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-carousel {
      position: relative;
      width: 100%;

      &:focus {
        outline: none;
      }

      &:focus-visible {
        outline: 2px solid var(--mp-color-primary-default);
        outline-offset: 2px;
        border-radius: var(--mp-radius-lg);
      }

      &__viewport {
        overflow: hidden;
        border-radius: var(--mp-radius-lg);
        touch-action: pan-y;
        user-select: none;
      }

      &__track {
        display: flex;
        width: 100%;
        transition: transform 400ms ease;

        > :deep(*) {
          flex: 0 0 100%;
          min-width: 0;
          box-sizing: border-box;
        }
      }

      &__control {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid var(--mp-color-border-default);
        background: var(--mp-color-bg-surface);
        color: var(--mp-color-text-default);
        font-size: 24px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--mp-shadow-sm);

        &--prev {
          left: var(--mp-spacing-2);
        }

        &--next {
          right: var(--mp-spacing-2);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        &:hover:not(:disabled) {
          background: var(--mp-color-bg-base-alt);
        }
      }

      &__indicators {
        display: flex;
        justify-content: center;
        gap: var(--mp-spacing-2);
        margin-top: var(--mp-spacing-3);
      }

      &__indicator {
        /* Keep the visible dot small while guaranteeing a >=24x24px hit area
           so the control satisfies WCAG 2.2 SC 2.5.8 (Target Size, Minimum). */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;

        &::before {
          content: '';
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--mp-color-border-default);
          transition: background 200ms ease;
        }

        &--active::before {
          background: var(--mp-color-primary-default);
        }

        &:focus-visible {
          outline: 2px solid var(--mp-color-primary-default);
          outline-offset: 2px;
        }
      }

      &__autoplay {
        /* Always-available pause/play control for autoplaying carousels
           (WCAG 2.2.2 Pause, Stop, Hide). Sized to meet the 24px target min. */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin: var(--mp-spacing-2) auto 0;
        padding: 0;
        border: 1px solid var(--mp-color-border-default);
        border-radius: 50%;
        background: var(--mp-color-bg-surface);
        color: var(--mp-color-text-default);
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        box-shadow: var(--mp-shadow-sm);

        &:hover {
          background: var(--mp-color-bg-base-alt);
        }

        &:focus-visible {
          outline: 2px solid var(--mp-color-primary-default);
          outline-offset: 2px;
        }
      }
    }
  }
</style>
