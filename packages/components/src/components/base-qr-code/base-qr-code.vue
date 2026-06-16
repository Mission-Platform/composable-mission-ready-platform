<script lang="ts" setup>
  /**
   * `BaseQrCode` — renders a scannable QR Code for the Mission Platform UI.
   *
   * The payload (`value`) is encoded entirely on the client by the bundled,
   * dependency-free {@link encodeQr} encoder (byte mode, automatic version
   * selection, lowest-penalty data mask) and drawn as a crisp, resolution-
   * independent SVG. A single `<path>` is emitted for all dark modules, so the
   * markup stays compact even for large codes.
   *
   * For reliable scanning the dark / light colours default to solid black on
   * white rather than theme tokens, but both are overridable via `color` /
   * `background`. The `margin` prop controls the mandatory quiet-zone border.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { computed } from 'vue';

  import { encodeQr, type QrErrorCorrection } from './qr-encode';

  const props = withDefaults(
    defineProps<{
      /** The data to encode (URL, text, etc.). */
      value: string;
      /** Error-correction level. Higher levels survive more damage. Defaults to `'M'`. */
      errorCorrection?: QrErrorCorrection;
      /** Rendered side length in pixels. Defaults to `160`. */
      size?: number;
      /** Quiet-zone border width, in modules. The spec recommends `4`. */
      margin?: number;
      /** Colour of the dark modules. Defaults to solid black for scannability. */
      color?: string;
      /** Colour of the background / light modules. Defaults to solid white. */
      background?: string;
      /** Accessible label describing the code's destination. */
      ariaLabel?: string;
    }>(),
    {
      errorCorrection: 'M',
      size: 160,
      margin: 4,
      color: '#000000',
      background: '#ffffff',
      ariaLabel: undefined,
    },
  );

  const emit = defineEmits<{
    /** Emitted when `value` cannot be encoded (e.g. it is too long). */
    error: [error: Error];
  }>();

  interface RenderedQr {
    /** Side length of the viewBox, including the quiet-zone margin. */
    dimension: number;
    /** SVG path data covering every dark module. */
    path: string;
  }

  const rendered = computed<RenderedQr | null>(() => {
    try {
      const matrix = encodeQr(props.value, props.errorCorrection);
      const margin = Math.max(0, Math.floor(props.margin));
      const dimension = matrix.size + margin * 2;
      const parts: string[] = [];
      for (let y = 0; y < matrix.size; y++) {
        for (let x = 0; x < matrix.size; x++) {
          if (matrix.modules[y][x]) {
            parts.push(`M${x + margin} ${y + margin}h1v1h-1z`);
          }
        }
      }
      return { dimension, path: parts.join('') };
    } catch (error) {
      emit('error', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  });
</script>

<template>
  <svg
    v-if="rendered"
    :aria-hidden="ariaLabel ? undefined : true"
    :aria-label="ariaLabel"
    :height="size"
    :role="ariaLabel ? 'img' : undefined"
    :viewBox="`0 0 ${rendered.dimension} ${rendered.dimension}`"
    :width="size"
    class="base-qr-code"
    shape-rendering="crispEdges"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      :fill="background"
      :height="rendered.dimension"
      :width="rendered.dimension"
      class="base-qr-code__background"
      x="0"
      y="0"
    />
    <path
      :d="rendered.path"
      :fill="color"
      class="base-qr-code__modules"
    />
  </svg>
</template>

<style lang="scss" scoped>
  @layer mp.components {
    .base-qr-code {
      display: block;
      max-width: 100%;
      height: auto;
    }
  }
</style>
