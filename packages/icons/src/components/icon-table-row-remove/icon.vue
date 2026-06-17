<script lang="ts" setup>
  import { useIconSize } from '../../use-icon-size.ts';

  const props = withDefaults(
    defineProps<{
      size?: number | string;
      color?: string;
      ariaLabel?: string;
    }>(),
    {
      size: 'md',
      color: 'currentColor',
      ariaLabel: undefined,
    },
  );

  const sizeValue = useIconSize(() => props.size);
</script>

<template>
  <svg
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel ?? 'Remove Table Row'"
    :height="sizeValue"
    :stroke="color"
    :width="sizeValue"
    class="base-icon-table-row-remove"
    fill="none"
    role="img"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3 3h18v10H3z" />
    <line
      x1="9"
      x2="9"
      y1="3"
      y2="13"
    />
    <line
      x1="15"
      x2="15"
      y1="3"
      y2="13"
    />
    <line
      x1="9"
      x2="15"
      y1="17"
      y2="23"
    />
    <line
      x1="15"
      x2="9"
      y1="17"
      y2="23"
    />
  </svg>
</template>

<style scoped>
  @layer mp.icons {
    .base-icon-table-row-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      vertical-align: middle;
    }
  }
</style>
