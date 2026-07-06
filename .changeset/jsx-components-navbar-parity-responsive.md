---
'@mission-platform/components': minor
---

match the jsx navbar item to its vue source by rendering the dropdown chevron with the write-once `IconChevron` (direction-driven, size `sm`), and make every component responsive by porting the table's `bp-up('sm')` cell-padding step-up as a 768px media query and capping all floating panels (navbar/menubar dropdowns, popover, and the date/date-range/date-time-range calendars) to the viewport width so they never overflow on mobile
