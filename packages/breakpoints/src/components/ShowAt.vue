<script lang="ts" setup>
  import { computed } from 'vue';

  import { type BreakpointKey, breakpointKeys } from '../breakpoints';
  import { useBreakpoints } from '../use-breakpoints';

  const props = defineProps<{
    /** Show slot content when the viewport is at or above this breakpoint. */
    min?: BreakpointKey;
    /** Show slot content when the viewport is strictly below this breakpoint. */
    max?: BreakpointKey;
  }>();

  if (props.min !== undefined && !breakpointKeys.includes(props.min as BreakpointKey)) {
    console.warn(`[ShowAt] Unknown breakpoint key "${props.min}"`);
  }
  if (props.max !== undefined && !breakpointKeys.includes(props.max as BreakpointKey)) {
    console.warn(`[ShowAt] Unknown breakpoint key "${props.max}"`);
  }

  const { isAbove, isBelow } = useBreakpoints();

  const visible = computed(() => {
    const aboveMin = props.min === undefined || isAbove(props.min);
    const belowMax = props.max === undefined || isBelow(props.max);
    return aboveMin && belowMax;
  });
</script>

<template>
  <slot v-if="visible" />
</template>
