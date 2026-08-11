import {
  generateTimelineSegments,
  positionToTime,
  timeToPosition,
} from "./timeline";

describe("timeline utilities", () => {
  it("generates month segments with variable month boundaries", () => {
    const segments = generateTimelineSegments(
      "month",
      {
        start: new Date("2026-01-15T00:00:00Z"),
        end: new Date("2026-04-15T00:00:00Z"),
      },
      { zone: "UTC" },
    );

    expect(segments.map((segment) => segment.label)).toEqual([
      "Jan 2026",
      "Feb 2026",
      "Mar 2026",
      "Apr 2026",
    ]);
    expect(segments[0]!.start).toEqual(new Date("2026-01-15T00:00:00Z"));
    expect(segments[1]!.start).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  it("round-trips pixel and time positions and clamps input positions", () => {
    const range = {
      start: new Date("2026-01-01T00:00:00Z"),
      end: new Date("2026-01-01T04:00:00Z"),
    };
    const middle = positionToTime(50, range, 100);
    expect(timeToPosition(middle, range, 100)).toBe(50);
    expect(positionToTime(-10, range, 100)).toEqual(range.start);
    expect(positionToTime(110, range, 100)).toEqual(range.end);
  });
});
