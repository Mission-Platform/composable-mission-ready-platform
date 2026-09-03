import { DateTime } from "luxon";

import type { PlannerScale, TimelineOptions, TimelineSegment } from "../types";

function zoned(date: Date, zone?: string): DateTime {
  return DateTime.fromJSDate(date, { zone: zone ?? "local" });
}

export function generateTimelineSegments(
  scale: PlannerScale,
  range: { start: Date; end: Date },
  options: TimelineOptions = {},
): TimelineSegment[] {
  const start = zoned(range.start, options.zone);
  const end = zoned(range.end, options.zone);
  const segments: TimelineSegment[] = [];
  let cursor =
    scale === "hour"
      ? start.startOf("hour")
      : scale === "day"
        ? start.startOf("day")
        : start.startOf("month");
  const unit = scale === "hour" ? "hours" : scale === "day" ? "days" : "months";
  const slotWidth =
    options.slotWidth ?? (scale === "hour" ? 96 : scale === "day" ? 144 : 180);

  while (cursor < end) {
    const next = cursor.plus({ [unit]: 1 });
    const segmentStart = DateTime.fromMillis(
      Math.max(cursor.toMillis(), start.toMillis()),
      { zone: cursor.zone },
    );
    const segmentEnd = DateTime.fromMillis(
      Math.min(next.toMillis(), end.toMillis()),
      { zone: cursor.zone },
    );
    const label =
      scale === "hour"
        ? cursor.toFormat("HH:mm")
        : scale === "day"
          ? cursor.setLocale(options.locale ?? "en-US").toFormat("ccc d")
          : cursor.setLocale(options.locale ?? "en-US").toFormat("LLL yyyy");
    segments.push({
      start: segmentStart.toJSDate(),
      end: segmentEnd.toJSDate(),
      label,
      index: segments.length,
      width: slotWidth,
    });
    cursor = next;
  }
  return segments;
}

export function timeToPosition(
  time: Date,
  range: { start: Date; end: Date },
  width: number,
): number {
  const total = range.end.getTime() - range.start.getTime();
  if (total <= 0) return 0;
  return ((time.getTime() - range.start.getTime()) / total) * width;
}

export function positionToTime(
  position: number,
  range: { start: Date; end: Date },
  width: number,
): Date {
  if (width <= 0) return new Date(range.start);
  const ratio = Math.min(1, Math.max(0, position / width));
  return new Date(
    range.start.getTime() +
      (range.end.getTime() - range.start.getTime()) * ratio,
  );
}

export function clampToRange(
  value: Date,
  range: { start: Date; end: Date },
): Date {
  return new Date(
    Math.min(
      range.end.getTime(),
      Math.max(range.start.getTime(), value.getTime()),
    ),
  );
}
