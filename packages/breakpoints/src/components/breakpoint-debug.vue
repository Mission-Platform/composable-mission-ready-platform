<script lang="ts" setup>
  import { mpNamespace, useI18n } from '@mission-platform/i18n/vue';

  import { breakpointKeys, breakpoints } from '../breakpoints';
  import { useBreakpoints } from '../use-breakpoints';

  const { current, active } = useBreakpoints();
  // Resolve against this package's own `mp.breakpoints` namespace so consuming
  // apps can override these strings without colliding with their own keys.
  const { t } = useI18n(mpNamespace('breakpoints'));
</script>

<template>
  <div
    aria-hidden="true"
    class="bp-debug"
  >
    <span class="bp-debug__label">{{ t('breakpoint') }}</span>
    <span class="bp-debug__current">{{ current }}</span>
    <span class="bp-debug__separator">{{ t('separator') }}</span>
    <span
      v-for="key in breakpointKeys"
      :key="key"
      :class="{ 'bp-debug__badge--active': active[key] }"
      class="bp-debug__badge"
    >
      {{ key }}
      <span class="bp-debug__px">{{ t('debug_px', { breakpoint: breakpoints[key] }) }}</span>
    </span>
  </div>
</template>

<style lang="scss" scoped>
  @layer mp.breakpoints {
    .bp-debug {
      position: fixed;
      right: 0;
      bottom: 0;
      z-index: 9999;
      display: flex;
      gap: var(--mp-spacing-1, 0.286rem);
      align-items: center;
      padding: var(--mp-spacing-1, 0.286rem) var(--mp-spacing-2, 0.571rem);
      font-family: var(--mp-font-family-mono, monospace) monospace;
      font-size: var(--mp-size-font-2xs, 0.643rem);

      /* White text on a near-black overlay gives contrast well above the WCAG AA 4.5:1 threshold. */

      /* --mp-color-bg-scrim is a semi-transparent token (rgb(0 0 0 / 50%)) that composites to a */

      /* mid-gray (~#808080) against a white background — making it impossible for any text to pass */

      /* 4.5:1. A solid dark overlay is required for the debug badge to be WCAG compliant. */
      color: var(--mp-color-text-inverse, #f9f9fb);
      background: rgb(8 6 13 / 85%);
      border-top-left-radius: var(--mp-radius-sm, 0.286rem);

      &__label {
        margin-right: var(--mp-spacing-1, 0.286rem);

        /* Slightly dimmed but still readable; 85% opacity on near-white over near-black is ≥4.5:1 */
        opacity: 0.85;
      }

      &__current {
        font-weight: var(--mp-font-weight-bold);

        /* success-muted (#d0f4df) is a light green — high contrast on the near-black overlay */
        color: var(--mp-color-success-muted, #d0f4df);
      }

      &__separator {
        margin: 0 var(--mp-spacing-1, 0.286rem);
        opacity: 0.6;
      }

      &__badge {
        padding: var(--mp-size-pad-block-2xs, 0.143rem) var(--mp-size-pad-inline-2xs, 0.286rem);
        border-radius: var(--mp-radius-xs, 0.286rem);
        color: var(--mp-color-text-inverse, #f9f9fb);

        &--active {
          /* Dark text on the light success-muted badge background — token bg-base is near-black in */

          /* most themes; use text-primary which is always the darkest text token for legibility */
          color: var(--mp-color-text-primary, #08060d);
          background: var(--mp-color-success-muted, #d0f4df);

          .bp-debug__px {
            color: var(--mp-color-text-primary, #08060d);
          }
        }
      }

      &__px {
        margin-left: 0.1rem;
        font-size: var(--mp-size-font-2xs, 0.643rem);
        color: inherit;
      }
    }
  }
</style>

<i18n lang="yaml">
en:
  breakpoint: 'breakpoint:'
  separator: '|'
  debug_px: '({breakpoint}px)'
</i18n>
