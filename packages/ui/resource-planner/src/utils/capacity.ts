import { parseDate } from "@mission-platform/vcard";

import type {
  CapacityState,
  NormalizedAvailabilityInterval,
  PlannerEventRecord,
  TimelineSegment,
} from "../types";

function overlapMinutes(
  start: Date,
  end: Date,
  otherStart: Date,
  otherEnd: Date,
): number {
  const overlap =
    Math.min(end.getTime(), otherEnd.getTime()) -
    Math.max(start.getTime(), otherStart.getTime());
  return Math.max(0, overlap) / 60_000;
}

export function calculateCapacityState(
  resourceId: string,
  segment: TimelineSegment | { start: Date; end: Date },
  availability: NormalizedAvailabilityInterval[],
  events: PlannerEventRecord[],
): CapacityState {
  const start = segment.start;
  const end = segment.end;
  const resourceAvailability = availability.filter(
    (interval) => interval.resourceId === resourceId,
  );
  const resourceEvents = events.filter(
    (record) => record.resourceId === resourceId,
  );
  let availableMinutes = 0;
  let capacityUnits = 0;
  for (const interval of resourceAvailability) {
    const minutes = overlapMinutes(
      start,
      end,
      parseDate(interval.start),
      parseDate(interval.end),
    );
    availableMinutes += minutes;
    capacityUnits += (minutes / 60) * (interval.capacity ?? 1);
  }
  let bookedMinutes = 0;
  let bookedCapacityUnits = 0;
  for (const record of resourceEvents) {
    const minutes = overlapMinutes(
      start,
      end,
      parseDate(record.event.dtstart),
      parseDate(record.event.dtend),
    );
    bookedMinutes += minutes;
    bookedCapacityUnits += minutes / 60;
  }
  const overlappingEvents = resourceEvents.filter((record, index) =>
    resourceEvents.some((other, otherIndex) => {
      if (index === otherIndex) return false;
      return (
        parseDate(record.event.dtstart) < parseDate(other.event.dtend) &&
        parseDate(other.event.dtstart) < parseDate(record.event.dtend)
      );
    }),
  );
  const status =
    availableMinutes === 0
      ? "unavailable"
      : overlappingEvents.length > 0
        ? "conflict"
        : bookedCapacityUnits > capacityUnits
          ? "over-capacity"
          : "available";
  return {
    resourceId,
    start,
    end,
    availableMinutes,
    bookedMinutes,
    remainingMinutes: availableMinutes - bookedMinutes,
    capacityUnits,
    bookedCapacityUnits,
    remainingCapacityUnits: capacityUnits - bookedCapacityUnits,
    status,
  };
}
