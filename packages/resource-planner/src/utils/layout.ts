import { parseDate } from "@mission-platform/vcard";

import type { PlannerEventGeometry, PlannerEventRecord } from "../types";

export function layoutResourceEvents(
  records: PlannerEventRecord[],
  range: { start: Date; end: Date },
  width: number,
): PlannerEventGeometry[] {
  const sorted = records.toSorted(
    (a, b) =>
      parseDate(a.event.dtstart).getTime() -
      parseDate(b.event.dtstart).getTime(),
  );
  return sorted.map((record) => {
    const sameResource = sorted.filter(
      (other) => other.resourceId === record.resourceId,
    );
    const start = parseDate(record.event.dtstart).getTime();
    const end = parseDate(record.event.dtend).getTime();
    const overlaps = (other: PlannerEventRecord): boolean => {
      const otherStart = parseDate(other.event.dtstart).getTime();
      const otherEnd = parseDate(other.event.dtend).getTime();
      return otherStart < end && otherEnd > start;
    };
    const columns: PlannerEventRecord[][] = [];
    for (const other of sameResource) {
      const otherStart = parseDate(other.event.dtstart).getTime();
      let column = columns.findIndex((columnEvents) => {
        const last = columnEvents.at(-1);
        return last && parseDate(last.event.dtend).getTime() <= otherStart;
      });
      if (column < 0) column = columns.length;
      (columns[column] ??= []).push(other);
    }
    const column = columns.findIndex((columnEvents) =>
      columnEvents.includes(record),
    );
    const totalColumns = columns.filter((columnEvents) =>
      columnEvents.some((columnEvent) => overlaps(columnEvent)),
    ).length;
    const rangeStart = range.start.getTime();
    const rangeDuration = range.end.getTime() - rangeStart;
    const left =
      rangeDuration > 0
        ? ((Math.max(rangeStart, start) - rangeStart) / rangeDuration) * width
        : 0;
    const right =
      rangeDuration > 0
        ? ((Math.min(range.end.getTime(), end) - rangeStart) / rangeDuration) *
          width
        : left;
    return {
      event: record.event,
      resourceId: record.resourceId,
      left,
      width: Math.max(0, right - left),
      column,
      totalColumns: Math.max(1, totalColumns),
    };
  });
}
