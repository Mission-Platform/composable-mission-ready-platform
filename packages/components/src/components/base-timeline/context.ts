import type { TimelineOrientation, TimelineAlign } from './base-timeline.vue';
import type { InjectionKey, ComputedRef } from 'vue';


/** Shared layout state injected into `BaseTimelineItem` children. */
export interface TimelineContext {
  /** Orientation inherited from the parent {@link BaseTimeline}. */
  orientation: TimelineOrientation;
  /** Vertical alignment strategy inherited from the parent {@link BaseTimeline}. */
  align: TimelineAlign;
}

/** Injection key for the {@link TimelineContext} provided by `BaseTimeline`. */
export const TimelineContextKey: InjectionKey<ComputedRef<TimelineContext>> = Symbol('mp-timeline');
