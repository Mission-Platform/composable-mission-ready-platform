import { type DeepReadonly, type Ref, onMounted, onUnmounted, readonly, ref } from 'vue'

import {
  type BreakpointKey,
  type BreakpointValues,
  breakpointKeys,
  breakpoints,
  mediaQuery,
  resolveBreakpoint,
} from './breakpoints'

export type { BreakpointKey, BreakpointValues } from './breakpoints'

export interface UseBreakpointsReturn {
  /** The currently active breakpoint key. */
  current: DeepReadonly<Ref<BreakpointKey>>
  /** `true` when the viewport width is at or above the given breakpoint. */
  isAbove: (bp: BreakpointKey) => boolean
  /** `true` when the viewport width is strictly below the given breakpoint. */
  isBelow: (bp: BreakpointKey) => boolean
  /** `true` only when the viewport falls exactly within the given band. */
  isOnly: (bp: BreakpointKey) => boolean
  /** A reactive map of `{ [key]: boolean }` — `true` when ≥ that breakpoint. */
  active: DeepReadonly<Ref<BreakpointValues>>
}

function getWidth(): number {
  return globalThis.window === undefined ? 0 : globalThis.window.innerWidth
}

/**
 * Reactive composable that tracks the current viewport breakpoint.
 *
 * Uses native `matchMedia` listeners, so it reacts instantly to window
 * resizes without polling.
 *
 * @example
 * ```ts
 * const { current, isAbove } = useBreakpoints()
 * const isDesktop = computed(() => isAbove('lg'))
 * ```
 */
export function useBreakpoints(): UseBreakpointsReturn {
  const current = ref<BreakpointKey>(resolveBreakpoint(getWidth()))

  const active = ref<BreakpointValues>(
    Object.fromEntries(
      breakpointKeys.map((k) => [k, getWidth() >= breakpoints[k]]),
    ) as BreakpointValues,
  )

  const mqls = new Map<BreakpointKey, MediaQueryList>()

  function updateActive(): void {
    const width = getWidth()
    current.value = resolveBreakpoint(width)
    for (const key of breakpointKeys) {
      active.value[key] = width >= breakpoints[key]
    }
  }

  onMounted(() => {
    if (globalThis.window === undefined) return

    for (const key of breakpointKeys) {
      if (breakpoints[key] === 0) continue
      const mql = globalThis.window.matchMedia(mediaQuery(key))
      mql.addEventListener('change', updateActive)
      mqls.set(key, mql)
    }

    updateActive()
  })

  onUnmounted(() => {
    for (const mql of mqls.values()) {
      mql.removeEventListener('change', updateActive)
    }
    mqls.clear()
  })

  const isAbove = (bp: BreakpointKey): boolean => active.value[bp]

  const isBelow = (bp: BreakpointKey): boolean => !active.value[bp]

  const isOnly = (bp: BreakpointKey): boolean => {
    const index = breakpointKeys.indexOf(bp)
    const nextKey = breakpointKeys[index + 1] as BreakpointKey | undefined
    return active.value[bp] && (nextKey === undefined || !active.value[nextKey])
  }

  return {
    current: readonly(current),
    active: readonly(active),
    isAbove,
    isBelow,
    isOnly,
  }
}
