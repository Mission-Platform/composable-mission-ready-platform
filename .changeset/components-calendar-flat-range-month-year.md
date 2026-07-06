---
'@mission-platform/components': minor
---

Enhance `BaseCalendar` and the date pickers that compose it:

- Add a `flat` prop to `BaseCalendar` that drops its own border, shadow, and
  background so it sits flush inside an already-bordered container; the date
  pickers (`BaseDateInput`, `BaseDateRangeInput`, `BaseDateTimeRangeInput`) now
  set it to avoid the doubled outline against the `BaseDropdown` panel.
- Add `rangeStart`/`rangeEnd` props that highlight a selected range (start/end
  caps plus the days in between, matching the original Vue range styling). The
  range pickers pass these to their calendars so the picked range is shown
  across the months.
- Make the month label clickable to jump to a twelve-month grid, and the year
  clickable to jump to a decade year grid that pages in groups of ten
  (2026 → 2020–2029), for quick navigation to distant dates.
- Give the date pickers' `BaseDropdown` panel a taller `maxHeight` so the
  calendar fits without an inner scrollbar.
- Rebuild `BaseDateTimeRangeInput` as a two-step `BaseFormWizard` whose first
  step (**Date**) picks the range's start/end dates and whose second step
  (**Time**) picks the start/end times, with the Finish button closing the
  popover, instead of two side-by-side panes.
