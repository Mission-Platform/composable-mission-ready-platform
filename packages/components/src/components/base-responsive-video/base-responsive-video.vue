<script lang="ts" setup>
  /**
   * `BaseResponsiveVideo` — Responsive `<video>` element for the Mission
   * Platform UI.
   *
   * Renders a `<video>` that scales to its container while preserving a fixed
   * `aspectRatio` (avoiding layout shift). Supports multiple `<source>` entries
   * for format negotiation, a poster image, native controls, and the usual
   * playback flags. For decorative, content-free backgrounds, prefer
   * `BaseBackgroundVideo`.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */

  /** A single format-specific video source. */
  export interface ResponsiveVideoSource {
    /** Media URL. */
    src: string;
    /** MIME type (e.g. `'video/webm'`). */
    type?: string;
    /** Optional media condition. */
    media?: string;
  }

  /** How the video fills its box. */
  export type ResponsiveVideoFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  withDefaults(
    defineProps<{
      /** Single video URL. Use `sources` for multiple formats. */
      src?: string;
      /** Format-specific `<source>` entries. */
      sources?: ResponsiveVideoSource[];
      /** Poster image shown before playback. */
      poster?: string;
      /** Accessible label for the video (maps to `aria-label`). */
      label?: string;
      /** Show native playback controls. Defaults to `true`. */
      controls?: boolean;
      /** Autoplay (requires `muted` in most browsers). */
      autoplay?: boolean;
      /** Loop playback. */
      loop?: boolean;
      /** Mute audio. */
      muted?: boolean;
      /** Play inline on mobile rather than fullscreen. Defaults to `true`. */
      playsinline?: boolean;
      /** Preload strategy. Defaults to `'metadata'`. */
      preload?: 'none' | 'metadata' | 'auto';
      /** CSS `aspect-ratio` (e.g. `'16 / 9'`). Defaults to `'16 / 9'`. */
      aspectRatio?: string;
      /** `object-fit` of the video within its box. Defaults to `'contain'`. */
      fit?: ResponsiveVideoFit;
      /** Apply a rounded corner radius. */
      rounded?: boolean;
    }>(),
    {
      src: undefined,
      sources: () => [],
      poster: undefined,
      label: undefined,
      controls: true,
      autoplay: false,
      loop: false,
      muted: false,
      playsinline: true,
      preload: 'metadata',
      aspectRatio: '16 / 9',
      fit: 'contain',
      rounded: false,
    },
  );

  const emit = defineEmits<{
    /** Native `play` event. */
    play: [event: Event];
    /** Native `pause` event. */
    pause: [event: Event];
    /** Native `ended` event. */
    ended: [event: Event];
  }>();
</script>

<template>
  <video
    :aria-label="label"
    :autoplay="autoplay"
    :class="['base-responsive-video', { 'base-responsive-video--rounded': rounded }]"
    :controls="controls"
    :loop="loop"
    :muted="muted"
    :playsinline="playsinline"
    :poster="poster"
    :preload="preload"
    :src="sources.length ? undefined : src"
    :style="{ aspectRatio, objectFit: fit }"
    @ended="emit('ended', $event)"
    @pause="emit('pause', $event)"
    @play="emit('play', $event)"
  >
    <source
      v-for="(source, index) in sources"
      :key="index"
      :media="source.media"
      :src="source.src"
      :type="source.type"
    />
  </video>
</template>

<style lang="scss" scoped>
  .base-responsive-video {
    display: block;
    width: 100%;
    height: auto;
    background-color: var(--mp-color-bg-sunken);

    &--rounded {
      border-radius: var(--mp-radius-lg);
      overflow: hidden;
    }
  }
</style>
