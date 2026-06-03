import { type DeepReadonly, type Ref } from 'vue';
import { type BreakpointKey, type BreakpointValues } from './breakpoints';
export type { BreakpointKey, BreakpointValues } from './breakpoints';
export interface UseBreakpointsReturn {
    /** The currently active breakpoint key. */
    current: DeepReadonly<Ref<BreakpointKey>>;
    /** `true` when the viewport width is at or above the given breakpoint. */
    isAbove: (bp: BreakpointKey) => boolean;
    /** `true` when the viewport width is strictly below the given breakpoint. */
    isBelow: (bp: BreakpointKey) => boolean;
    /** `true` only when the viewport falls exactly within the given band. */
    isOnly: (bp: BreakpointKey) => boolean;
    /** A reactive map of `{ [key]: boolean }` — `true` when ≥ that breakpoint. */
    active: DeepReadonly<Ref<BreakpointValues>>;
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
export declare function useBreakpoints(): UseBreakpointsReturn;
