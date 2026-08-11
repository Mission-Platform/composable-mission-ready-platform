import { DateTime } from "luxon";

import type {
  AvailabilityException,
  AvailabilityInput,
  AvailabilityInterval,
  NormalizedAvailabilityInterval,
  ResourceAvailability,
} from "../types";

interface AvailabilityOptions {
  zone?: string;
}

function resourceAvailability(
  input: AvailabilityInput,
  resourceId: string,
): ResourceAvailability {
  if (Array.isArray(input)) {
    return (
      input.find((entry) => entry.resourceId === resourceId) ?? { resourceId }
    );
  }
  return { resourceId, ...input[resourceId] };
}

function dateTime(value: string, zone?: string): DateTime {
  return zone
    ? DateTime.fromISO(value, { zone })
    : DateTime.fromISO(value, { setZone: true });
}

function intervalDateTime(value: string, date: DateTime): DateTime {
  const timeOnly = /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value);
  if (!timeOnly) return dateTime(value);
  const [hour, minute, second = 0] = value.split(":").map(Number);
  return date.set({ hour, minute, second, millisecond: 0 });
}

function toInterval(
  resourceId: string,
  interval: AvailabilityInterval,
  date?: DateTime,
  zone?: string,
): NormalizedAvailabilityInterval | undefined {
  const start = date
    ? intervalDateTime(interval.start, date)
    : dateTime(interval.start, zone);
  let end = date
    ? intervalDateTime(interval.end, date)
    : dateTime(interval.end, zone);
  if (date && end <= start) end = end.plus({ days: 1 });
  if (!start.isValid || !end.isValid || end <= start) return undefined;
  return {
    resourceId,
    start: start.toISO()!,
    end: end.toISO()!,
    capacity: Math.max(0, interval.capacity ?? 1),
  };
}

function dayWindow(date: DateTime): { start: DateTime; end: DateTime } {
  const start = date.startOf("day");
  return { start, end: start.plus({ days: 1 }) };
}

function clipInterval(
  interval: NormalizedAvailabilityInterval,
  start: DateTime,
  end: DateTime,
): NormalizedAvailabilityInterval | undefined {
  const intervalStart = dateTime(interval.start);
  const intervalEnd = dateTime(interval.end);
  const clippedStart = intervalStart < start ? start : intervalStart;
  const clippedEnd = intervalEnd > end ? end : intervalEnd;
  if (clippedEnd <= clippedStart) return undefined;
  return {
    ...interval,
    start: clippedStart.toISO()!,
    end: clippedEnd.toISO()!,
  };
}

function subtractWindow(
  interval: NormalizedAvailabilityInterval,
  windowStart: DateTime,
  windowEnd: DateTime,
): NormalizedAvailabilityInterval[] {
  const start = dateTime(interval.start);
  const end = dateTime(interval.end);
  const result: NormalizedAvailabilityInterval[] = [];
  if (start < windowStart)
    result.push({ ...interval, end: windowStart.toISO()! });
  if (end > windowEnd) result.push({ ...interval, start: windowEnd.toISO()! });
  return result.filter((entry) => dateTime(entry.end) > dateTime(entry.start));
}

function applyExceptions(
  intervals: NormalizedAvailabilityInterval[],
  resourceId: string,
  exceptions: AvailabilityException[],
  rangeStart: DateTime,
  rangeEnd: DateTime,
  zone?: string,
): NormalizedAvailabilityInterval[] {
  let result = intervals;
  for (const exception of exceptions) {
    const exceptionDate = dateTime(exception.date, zone).startOf("day");
    const { start, end } = dayWindow(exceptionDate);
    result = result.flatMap((interval) => subtractWindow(interval, start, end));
    result.push(
      ...(exception.intervals
        .map((interval) =>
          toInterval(resourceId, interval, exceptionDate, zone),
        )
        .filter(Boolean) as NormalizedAvailabilityInterval[]),
    );
  }
  return result
    .map((interval) => clipInterval(interval, rangeStart, rangeEnd))
    .filter(Boolean) as NormalizedAvailabilityInterval[];
}

function mergeIntervals(
  intervals: NormalizedAvailabilityInterval[],
): NormalizedAvailabilityInterval[] {
  const sorted = intervals.toSorted(
    (a, b) => dateTime(a.start).toMillis() - dateTime(b.start).toMillis(),
  );
  const result: NormalizedAvailabilityInterval[] = [];
  for (const interval of sorted) {
    const previous = result.at(-1);
    if (previous && dateTime(interval.start) <= dateTime(previous.end)) {
      previous.end =
        dateTime(interval.end) > dateTime(previous.end)
          ? interval.end
          : previous.end;
      previous.capacity = Math.max(
        previous.capacity ?? 1,
        interval.capacity ?? 1,
      );
    } else {
      result.push({ ...interval });
    }
  }
  return result;
}

export function expandAvailability(
  resourceId: string,
  input: AvailabilityInput,
  range: { start: Date; end: Date },
  options: AvailabilityOptions = {},
): NormalizedAvailabilityInterval[] {
  const availability = resourceAvailability(input, resourceId);
  const rangeStart = DateTime.fromJSDate(range.start, {
    zone: options.zone ?? "local",
  });
  const rangeEnd = DateTime.fromJSDate(range.end, {
    zone: options.zone ?? "local",
  });
  const intervals = (availability.intervals ?? [])
    .map((interval) =>
      toInterval(resourceId, interval, undefined, options.zone),
    )
    .filter(Boolean) as NormalizedAvailabilityInterval[];

  const rules = availability.workingHours ?? [];
  for (
    let day = rangeStart.startOf("day");
    day < rangeEnd;
    day = day.plus({ days: 1 })
  ) {
    for (const rule of rules) {
      if (rule.weekday !== day.weekday % 7) continue;
      const interval = toInterval(
        resourceId,
        { start: rule.startTime, end: rule.endTime, capacity: rule.capacity },
        day,
        options.zone,
      );
      if (interval) intervals.push(interval);
    }
  }

  const withExceptions = applyExceptions(
    intervals,
    resourceId,
    availability.exceptions ?? [],
    rangeStart,
    rangeEnd,
    options.zone,
  );
  return mergeIntervals(withExceptions);
}

export function availabilityForResource(
  input: AvailabilityInput,
  resourceId: string,
): ResourceAvailability {
  return resourceAvailability(input, resourceId);
}
