import { moveEventPatch, resizeEventPatch } from "@mission-platform/scheduler";
import { fmtLike, parseDT } from "@mission-platform/vcard";

import type {
  PlannerAssignment,
  PlannerAssignmentUpdate,
  PlannerEditOptions,
  PlannerRangeSelection,
} from "../types";
import type { VEvent } from "@mission-platform/vcard";

function clampDelta(
  event: VEvent,
  deltaMs: number,
  boundary?: { start: Date; end: Date },
): number {
  if (!boundary) return deltaMs;
  const duration =
    parseDT(event.dtend).toMillis() - parseDT(event.dtstart).toMillis();
  const start = parseDT(event.dtstart).toMillis() + deltaMs;
  const end = start + duration;
  if (start < boundary.start.getTime())
    return boundary.start.getTime() - parseDT(event.dtstart).toMillis();
  if (end > boundary.end.getTime())
    return (
      boundary.end.getTime() - duration - parseDT(event.dtstart).toMillis()
    );
  return deltaMs;
}

export function movePlannerEventPatch(
  event: VEvent,
  deltaMs: number,
  options: PlannerEditOptions = {},
): Partial<Pick<VEvent, "dtstart" | "dtend">> {
  return moveEventPatch(event, clampDelta(event, deltaMs, options.boundary));
}

export function resizePlannerEventPatch(
  event: VEvent,
  deltaMs: number,
  edge: "start" | "end" = "end",
  options: PlannerEditOptions = {},
): Partial<Pick<VEvent, "dtstart" | "dtend">> {
  const minimumDuration =
    options.minimumDurationMs ??
    (event.dtstart.length === 10 ? 86_400_000 : 15 * 60_000);
  if (edge === "end") {
    const patch = resizeEventPatch(event, deltaMs);
    if (
      !options.boundary ||
      parseDT(patch.dtend).toMillis() <= options.boundary.end.getTime()
    )
      return patch;
    return {
      dtend: fmtLike(event.dtend, parseDT(options.boundary.end.toISOString())),
    };
  }
  const start = parseDT(event.dtstart).toMillis();
  const end = parseDT(event.dtend).toMillis();
  const nextStart = Math.min(start + deltaMs, end - minimumDuration);
  const boundedStart = options.boundary
    ? Math.max(options.boundary.start.getTime(), nextStart)
    : nextStart;
  return {
    dtstart: fmtLike(
      event.dtstart,
      parseDT(new Date(boundedStart).toISOString()),
    ),
  };
}

export function selectPlannerRange(
  resourceId: string,
  start: Date,
  end: Date,
  minimumDurationMs = 15 * 60_000,
): PlannerRangeSelection | undefined {
  const rangeStart = Math.min(start.getTime(), end.getTime());
  const rangeEnd = Math.max(start.getTime(), end.getTime());
  if (rangeEnd - rangeStart < minimumDurationMs) return undefined;
  return {
    resourceId,
    start: new Date(rangeStart).toISOString(),
    end: new Date(rangeEnd).toISOString(),
  };
}

export function reassignPlannerEvent(
  eventId: string,
  resourceId: string,
): PlannerAssignmentUpdate {
  return { eventId, resourceId };
}

export function applyAssignmentUpdate(
  assignments: PlannerAssignment[],
  update: PlannerAssignmentUpdate,
): PlannerAssignment[] {
  return assignments.map((assignment) =>
    assignment.eventId === update.eventId
      ? { ...assignment, resourceId: update.resourceId }
      : { ...assignment },
  );
}
