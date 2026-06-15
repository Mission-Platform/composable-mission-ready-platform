<script lang="ts" setup>
  /**
   * `BaseBackgroundVideo` — Decorative full-bleed background video for the
   * Mission Platform UI.
   *
   * Renders an autoplaying, muted, looping `<video>` that covers its container,
   * with optional foreground content (default slot) layered on top and an
   * optional scrim overlay to preserve contrast. The video is treated as
   * decorative (`aria-hidden`) and exposes no controls.
   *
   * The component honours `prefers-reduced-motion`: when the user has requested
   * reduced motion the video is not autoplayed and the `poster` image is shown
   * instead.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { onBeforeUnmount, onMounted, ref } from 'vue';

  /** A single format-specific video source. */
  export interface BackgroundVideoSource {
    /** Media URL. */
    src: string;
    /** MIME type (e.g. `'video/webm'`). */
    type?: string;
  }

  /** How the video fills its box. */
  export type BackgroundVideoFit = 'cover' | 'contain';

  withDefaults(
    defineProps<{
      /** Single video URL. Use `sources` for multiple formats. */
      src?: string;
      /** Format-specific `<source>` entries. */
      sources?: BackgroundVideoSource[];
      /** Poster image shown before/while loading and when motion is reduced. */
      poster?: string;
      /** `object-fit` of the video. Defaults to `'cover'`. */
      fit?: BackgroundVideoFit;
      /** Darken the video with a scrim overlay to improve foreground contrast. */
      overlay?: boolean;
      /** Minimum height of the container (any CSS length). Defaults to `'24rem'`. */
      minHeight?: string;
    }>(),
    {
      src: undefined,
      sources: () => [],
      poster: undefined,
      fit: 'cover',
      overlay: false,
      minHeight: '24rem',
    },
  );

  /**
   * Default slot — foreground content rendered above the video.
   * @slot default
   */
  defineSlots<{
    default?: (props: Record<string, never>) => unknown;
  }>();

  const videoElement = ref<HTMLVideoElement | null>(null);
  const reducedMotion = ref(false);

  let mediaQuery: MediaQueryList | null = null;

  function syncReducedMotion(): void {
    reducedMotion.value = mediaQuery?.matches ?? false;
    const element = videoElement.value;
    if (!element) return;
    try {
      if (reducedMotion.value) {
        element.pause();
      } else {
        // `play()` may return a promise that rejects (autoplay policy) or, in
        // non-browser environments, may not be implemented at all.
        const played = element.play();
        if (played && typeof played.then === 'function') {
          played.catch(() => {
            /* Autoplay can be rejected by the browser; ignore. */
          });
        }
      }
    } catch {
      /* Playback APIs may be unavailable (e.g. SSR / test environments). */
    }
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', syncReducedMotion);
    syncReducedMotion();
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', syncReducedMotion);
    mediaQuery = null;
  });
</script>

<template>
  <div
    :class="['base-background-video', { 'base-background-video--overlay': overlay }]"
    :style="{ minHeight }"
  >
    <video
      ref="videoElement"
      :autoplay="!reducedMotion"
      :poster="poster"
      :src="sources.length ? undefined : src"
      :style="{ objectFit: fit }"
      aria-hidden="true"
      class="base-background-video__video"
      loop
      muted
      playsinline
      preload="auto"
      tabindex="-1"
    >
      <source
        v-for="(source, index) in sources"
        :key="index"
        :src="source.src"
        :type="source.type"
      />
    </video>
    <div
      v-if="$slots.default"
      class="base-background-video__content"
    >
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .base-background-video {
    position: relative;
    overflow: hidden;
    isolation: isolate;

    &__video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -2;
    }

    &--overlay::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background-color: var(--mp-color-bg-scrim);
    }

    &__content {
      position: relative;
      z-index: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: inherit;
      padding: var(--mp-spacing-8);
      color: var(--mp-color-text-inverse);
    }
  }
</style>
