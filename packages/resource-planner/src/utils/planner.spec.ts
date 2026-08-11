import { parseDate } from "@mission-platform/vcard";

import { calculateCapacityState } from "./capacity";
import { layoutResourceEvents } from "./layout";
import {
  movePlannerEventPatch,
  resizePlannerEventPatch,
  selectPlannerRange,
} from "./mutations";

import type { VEvent } from "@mission-platform/vcard";

const event = (uid: string, start: string, end: string): VEvent => ({
  uid,
  dtstart: start,
  dtend: end,
  dtstamp: "2026-01-01T00:00:00.000Z",
});

describe("planner event calculations", () => {
  it("detects conflicts and over-capacity without changing event input", () => {
    const first = event(
      "first",
      "2026-01-01T09:00:00Z",
      "2026-01-01T11:00:00Z",
    );
    const second = event(
      "second",
      "2026-01-01T10:00:00Z",
      "2026-01-01T12:00:00Z",
    );
    const records = [
      { event: first, resourceId: "person-1" },
      { event: second, resourceId: "person-1" },
    ];
    const availability = [
      {
        resourceId: "person-1",
        start: "2026-01-01T09:00:00Z",
        end: "2026-01-01T12:00:00Z",
        capacity: 1,
      },
    ];
    const state = calculateCapacityState(
      "person-1",
      {
        start: new Date("2026-01-01T10:00:00Z"),
        end: new Date("2026-01-01T11:00:00Z"),
      },
      availability,
      records,
    );

    expect(state.status).toBe("conflict");
    expect(state.bookedCapacityUnits).toBe(2);
    expect(first.dtstart).toBe("2026-01-01T09:00:00Z");
  });

  it("stacks overlapping bookings deterministically", () => {
    const records = [
      {
        event: event("a", "2026-01-01T09:00:00Z", "2026-01-01T11:00:00Z"),
        resourceId: "person-1",
      },
      {
        event: event("b", "2026-01-01T09:30:00Z", "2026-01-01T10:30:00Z"),
        resourceId: "person-1",
      },
    ];
    const geometry = layoutResourceEvents(
      records,
      {
        start: new Date("2026-01-01T09:00:00Z"),
        end: new Date("2026-01-01T12:00:00Z"),
      },
      300,
    );

    expect(geometry.map((entry) => entry.column)).toEqual([0, 1]);
    expect(geometry.every((entry) => entry.totalColumns === 2)).toBe(true);
  });

  it("clamps move and resize proposals to edit constraints", () => {
    const source = event(
      "source",
      "2026-01-01T10:00:00Z",
      "2026-01-01T11:00:00Z",
    );
    const boundary = {
      start: new Date("2026-01-01T09:00:00Z"),
      end: new Date("2026-01-01T12:00:00Z"),
    };
    const moved = movePlannerEventPatch(source, 3 * 60 * 60 * 1000, {
      boundary,
    });
    const resized = resizePlannerEventPatch(source, 60 * 60 * 1000, "start");
    expect(parseDate(moved.dtstart!).toISOString()).toBe(
      "2026-01-01T11:00:00.000Z",
    );
    expect(parseDate(moved.dtend!).toISOString()).toBe(
      "2026-01-01T12:00:00.000Z",
    );
    expect(parseDate(resized.dtstart!).toISOString()).toBe(
      "2026-01-01T10:45:00.000Z",
    );
    expect(
      selectPlannerRange(
        "person-1",
        new Date("2026-01-01T10:00:00Z"),
        new Date("2026-01-01T10:05:00Z"),
      ),
    ).toBeUndefined();
  });
});
