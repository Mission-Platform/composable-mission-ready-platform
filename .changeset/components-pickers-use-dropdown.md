---
'@mission-platform/components': patch
---

Rebuild the date/time pickers (`BaseDateInput`, `BaseTimeInput`,
`BaseDateRangeInput`, `BaseTimeRangeInput`, `BaseDateTimeRangeInput`) on top of
the write-once `BaseDropdown` instead of each hand-rolling its own teleported,
CSS-anchored popover. The trigger is now projected into `BaseDropdown`'s
`trigger` slot and the calendar/time panel into its default slot, so the
teleport, anchor positioning, and outside-click/`Escape` dismissal are owned by
`BaseDropdown` (which already gets the `position-area` value right). This also
fixes the pickers not opening, since the duplicated popover logic that anchored
with an invalid `position-area` is gone.
