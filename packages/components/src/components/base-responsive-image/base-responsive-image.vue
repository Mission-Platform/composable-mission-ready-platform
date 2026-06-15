<script lang="ts" setup>
  /**
   * `BaseResponsiveImage` — Art-directed, responsive `<picture>` element for
   * the Mission Platform UI.
   *
   * Renders a `<picture>` with one `<source>` per entry in `sources` (for art
   * direction / format negotiation) and a fallback `<img>`. Supports native
   * `srcset`/`sizes`, lazy loading, async decoding, a fixed `aspectRatio`
   * (to reserve layout space and avoid CLS), and `object-fit` control.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  /** A single art-directed / format-specific image source. */
  export interface ResponsiveImageSource {
    /** Candidate string for the `srcset` attribute. */
    srcset: string;
    /** Media condition (e.g. `'(min-width: 768px)'`). */
    media?: string;
    /** MIME type (e.g. `'image/webp'`). */
    type?: string;
    /** `sizes` attribute for this source. */
    sizes?: string;
  }

  /** How the image fills its box. */
  export type ResponsiveImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  const props = withDefaults(
    defineProps<{
      /** Fallback image URL (required, also used by browsers without `<picture>` support). */
      src: string;
      /** Alternative text. Pass an empty string for decorative images. */
      alt: string;
      /** Art-directed / format-specific `<source>` entries. */
      sources?: ResponsiveImageSource[];
      /** `srcset` applied to the fallback `<img>`. */
      srcset?: string;
      /** `sizes` applied to the fallback `<img>`. */
      sizes?: string;
      /** Intrinsic width in pixels (reserves layout space). */
      width?: number | string;
      /** Intrinsic height in pixels (reserves layout space). */
      height?: number | string;
      /** Native loading strategy. Defaults to `'lazy'`. */
      loading?: 'lazy' | 'eager';
      /** Native decoding hint. Defaults to `'async'`. */
      decoding?: 'async' | 'sync' | 'auto';
      /** Fetch priority hint. */
      fetchpriority?: 'high' | 'low' | 'auto';
      /** CSS `aspect-ratio` (e.g. `'16 / 9'`) used to reserve space and avoid layout shift. */
      aspectRatio?: string;
      /** `object-fit` of the image within its box. Defaults to `'cover'`. */
      fit?: ResponsiveImageFit;
      /** Apply a rounded corner radius. */
      rounded?: boolean;
    }>(),
    {
      sources: () => [],
      srcset: undefined,
      sizes: undefined,
      width: undefined,
      height: undefined,
      loading: 'lazy',
      decoding: 'async',
      fetchpriority: undefined,
      aspectRatio: undefined,
      fit: 'cover',
      rounded: false,
    },
  );

  const emit = defineEmits<{
    /** Native image `load` event. */
    load: [event: Event];
    /** Native image `error` event. */
    error: [event: Event];
  }>();

  const pictureStyle = computed(() => (props.aspectRatio ? { aspectRatio: props.aspectRatio } : undefined));
</script>

<template>
  <picture
    :class="['base-responsive-image', { 'base-responsive-image--rounded': rounded }]"
    :style="pictureStyle"
  >
    <source
      v-for="(source, index) in sources"
      :key="index"
      :media="source.media"
      :sizes="source.sizes"
      :srcset="source.srcset"
      :type="source.type"
    />
    <img
      :alt="alt"
      :decoding="decoding"
      :fetchpriority="fetchpriority"
      :height="height"
      :loading="loading"
      :sizes="sizes"
      :src="src"
      :srcset="srcset"
      :style="{ objectFit: fit }"
      :width="width"
      class="base-responsive-image__img"
      @error="emit('error', $event)"
      @load="emit('load', $event)"
    />
  </picture>
</template>

<style lang="scss" scoped>
  .base-responsive-image {
    display: block;
    overflow: hidden;

    &--rounded {
      border-radius: var(--mp-radius-lg);
    }

    &__img {
      display: block;
      width: 100%;
      height: 100%;
    }
  }
</style>
