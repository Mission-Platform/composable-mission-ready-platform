import { DateTime } from "luxon";

import { expandAvailability } from "./availability";

describe("expandAvailability", () => {
  const range = {
    start: DateTime.fromISO("2026-03-08T00:00:00", {
      zone: "America/New_York",
    }).toJSDate(),
    end: DateTime.fromISO("2026-03-10T00:00:00", {
      zone: "America/New_York",
    }).toJSDate(),
  };

  it("expands working hours across a DST transition using the requested zone", () => {
    const intervals = expandAvailability(
      "person-1",
      {
        "person-1": {
          workingHours: [{ weekday: 0, startTime: "09:00", endTime: "17:00" }],
        },
      },
      range,
      { zone: "America/New_York" },
    );

    expect(intervals).toHaveLength(1);
    expect(
      DateTime.fromISO(intervals[0]!.start, { setZone: true }).toFormat("ZZ"),
    ).toBe("-04:00");
    expect(DateTime.fromISO(intervals[0]!.start, { setZone: true }).hour).toBe(
      9,
    );
  });

  it("replaces dated availability with an exception, including an empty exception", () => {
    const intervals = expandAvailability(
      "person-1",
      {
        "person-1": {
          intervals: [
            { start: "2026-03-09T09:00:00", end: "2026-03-09T17:00:00" },
          ],
          exceptions: [{ date: "2026-03-09", intervals: [] }],
        },
      },
      {
        start: new Date("2026-03-09T00:00:00Z"),
        end: new Date("2026-03-10T00:00:00Z"),
      },
    );

    expect(intervals).toEqual([]);
  });

  it("supports working hours that cross midnight", () => {
    const intervals = expandAvailability(
      "person-1",
      {
        "person-1": {
          workingHours: [{ weekday: 1, startTime: "22:00", endTime: "02:00" }],
        },
      },
      {
        start: new Date("2026-03-09T00:00:00Z"),
        end: new Date("2026-03-10T00:00:00Z"),
      },
    );

    expect(intervals[0]!.start).toContain("22:00");
    expect(
      DateTime.fromISO(intervals[0]!.end).diff(
        DateTime.fromISO(intervals[0]!.start),
        "hours",
      ).hours,
    ).toBe(4);
  });
});
