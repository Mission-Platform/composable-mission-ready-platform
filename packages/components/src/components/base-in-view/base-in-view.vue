<script lang="ts" setup>
  /**
   * InView — wraps content and uses IntersectionObserver to detect when it
   * enters the viewport. Once visible, content is revealed with a configurable
   * animation. Useful for lazy-loading sections, fade-in cards, etc.
   *
   * Props
   *   threshold    — 0–1 intersection ratio required to trigger (default 0.15)
   *   rootMargin   — IntersectionObserver rootMargin (default '0px')
   *   animation    — reveal animation: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'none'
   *   duration     — CSS transition duration in ms (default 500)
   *   delay        — CSS transition delay in ms (default 0)
   *   once         — if true (default) only triggers once and disconnects the observer
   *   tag          — HTML element to render as the wrapper (default 'div')
   *
   * Slots
   *   default({ inView, hasBeenInView }) — slotted content receives reactive state
   *
   * Events
   *   enter — emitted when the element enters the viewport
   *   leave — emitted when the element leaves the viewport (only when once=false)
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue';

  export type InViewAnimation = 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' | 'none';

  const props = withDefaults(
    defineProps<{
      threshold?: number;
      rootMargin?: string;
      animation?: InViewAnimation;
      duration?: number;
      delay?: number;
      once?: boolean;
      tag?: string;
    }>(),
    {
      threshold: 0.15,
      rootMargin: '0px',
      animation: 'fade',
      duration: 500,
      delay: 0,
      once: true,
      tag: 'div',
    },
  );

  const emit = defineEmits<{
    enter: [];
    leave: [];
  }>();

  const wrapperRef = ref<HTMLElement | null>(null);
  const inView = ref(false);
  const hasBeenInView = ref(false);

  // ── Hidden (before reveal) styles per animation ────────────────────────────
  const hiddenStyle = computed<Record<string, string | undefined>>(() => {
    switch (props.animation) {
      case 'fade':
        return { opacity: '0' };
      case 'slide-up':
        return { opacity: '0', transform: 'translateY(24px)' };
      case 'slide-left':
        return { opacity: '0', transform: 'translateX(24px)' };
      case 'slide-right':
        return { opacity: '0', transform: 'translateX(-24px)' };
      case 'scale':
        return { opacity: '0', transform: 'scale(0.92)' };
      default:
        return {};
    }
  });

  // ── Visible (after reveal) styles ─────────────────────────────────────────
  const visibleStyle = computed<Record<string, string | undefined>>(() => {
    if (props.animation === 'none') return {};
    return { opacity: '1', transform: 'none' };
  });

  // ── Combined style applied to the wrapper element ─────────────────────────
  const wrapperStyle = computed<Record<string, string | undefined>>(() => {
    const transition =
      props.animation === 'none'
        ? {}
        : {
            transition: `opacity ${props.duration}ms ease ${props.delay}ms, transform ${props.duration}ms ease ${props.delay}ms`,
          };

    const state = inView.value ? visibleStyle.value : hiddenStyle.value;

    return { ...state, ...transition };
  });

  // ── IntersectionObserver ───────────────────────────────────────────────────
  let observer: IntersectionObserver | null = null;

  function connect() {
    if (!wrapperRef.value) return;
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          inView.value = true;
          hasBeenInView.value = true;
          emit('enter');
          if (props.once) {
            observer?.disconnect();
            observer = null;
          }
        } else {
          if (!props.once) {
            inView.value = false;
            emit('leave');
          }
        }
      },
      { threshold: props.threshold, rootMargin: props.rootMargin },
    );
    observer.observe(wrapperRef.value);
  }

  onMounted(connect);
  onUnmounted(() => observer?.disconnect());

  defineExpose({ inView, hasBeenInView });
</script>

<template>
  <component
    :is="tag"
    ref="wrapperRef"
    :style="wrapperStyle"
    class="in-view"
  >
    <slot
      :has-been-in-view="hasBeenInView"
      :in-view="inView"
    />
  </component>
</template>
