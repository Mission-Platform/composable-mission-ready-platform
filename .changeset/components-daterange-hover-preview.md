---
'@mission-platform/components': minor
---

Preview the tentative range while picking a date range:

- Add a `previewEnd` prop and an `onHoverDate` callback to `BaseCalendar`. The
  grid reports the day under the cursor via `onHoverDate` (and `undefined` on
  leave), and when a `rangeStart` is set but no `rangeEnd` is yet, `previewEnd`
  lightly highlights the range from the start to that day (a softer in-between
  fill and a tentative end cap, distinct from the committed range styling).
- Wire `BaseDateRangeInput` to track the hovered day and feed it back to both
  calendars as `previewEnd` once a start is selected but the end is still open,
  so the range being chosen is shown as you hover before the second click; the
  hover state is cleared when the popover closes.
