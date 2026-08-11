import { eventsForRange } from "@mission-platform/scheduler";

import type { PlannerAssignment, PlannerEventRecord } from "../types";
import type { VEvent } from "@mission-platform/vcard";

export function normalizeAssignments(
  assignments: PlannerAssignment[],
): PlannerAssignment[] {
  const seen = new Set<string>();
  return assignments.filter((assignment) => {
    const key = `${assignment.eventId}:${assignment.resourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(assignment.eventId && assignment.resourceId);
  });
}

export function normalizePlannerEvents(
  events: VEvent[],
  assignments: PlannerAssignment[],
  range?: { start: Date; end: Date },
): PlannerEventRecord[] {
  const assignmentByEvent = new Map(
    normalizeAssignments(assignments).map((assignment) => [
      assignment.eventId,
      assignment.resourceId,
    ]),
  );
  const visibleEvents = range
    ? eventsForRange(events, range.start, range.end)
    : events;

  return visibleEvents.flatMap((event) => {
    const resourceId = assignmentByEvent.get(event.uid);
    return resourceId ? [{ event, resourceId }] : [];
  });
}

export function assignmentsForEvent(
  assignments: PlannerAssignment[],
  eventId: string,
): PlannerAssignment[] {
  return normalizeAssignments(assignments).filter(
    (assignment) => assignment.eventId === eventId,
  );
}
