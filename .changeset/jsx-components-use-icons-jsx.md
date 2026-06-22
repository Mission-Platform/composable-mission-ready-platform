---
'@mission-platform/components': minor
---

use the write-once icons-jsx components instead of text glyphs

Components that previously substituted the `@mission-platform/icons` SFCs with
text/CSS glyphs now render the write-once `@mission-platform/icons`
components (compiled to React/Vue alongside each consumer). Replaced: the
chevrons in `BaseSelect`, `BaseMultiselect`, `BaseAccordion`, `BaseCollapse`,
`BaseCalendar`, and `BaseScheduler` (`IconChevron`); the close affordances in
`BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseTabs`, `BaseVirtualTabs`,
`BaseAlertBanner`, `BaseToast`, and `BaseSearchInput` (`IconClose`); the add
buttons in `BaseTabs`/`BaseVirtualTabs` (`IconPlus`); the calendar trigger in
`BaseDateInput`/`BaseDateRangeInput`/`BaseDateTimeRangeInput` (`IconCalendar`,
plus `IconGlobe` for the timezone toggle); the upload glyph in `BaseFileInput`
(`IconUpload`); the stepper buttons in `BaseNumberStepper` (`IconMinus`/`IconPlus`);
and the search glyph in `BaseSearchInput` (`IconSearch`). The CSS chevron-rotation
classes were removed where the icon's own `direction` prop now handles it.
