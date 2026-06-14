---
'@mission-platform/components': minor
---

add number stepper, location, date/time and range inputs, conditional field blocks, and start/end input extensions

- add `BaseNumberStepper`, a numeric input with decrement/increment controls configurable as a signed/unsigned integer or a fixed-precision float
- add `BaseLocationInput` capturing a centimetre-accurate coordinate in LatLng, Decimal Degrees, DMS, DM, or GeoJSON, with `convertLocation`/`parseLocation` and other coordinate-conversion utilities
- extend the schema form and form builder with `stepper`, `date`, `time`, `daterange`, `timerange`, `datetimerange`, and `location` widgets plus integer/float/precision options
- support conditional field visibility via JSON Schema `ui.visibleWhen` (`allOf`/`anyOf`/`oneOf`), excluding hidden fields from validation
- add `start`/`end` extension slots to `BaseInput`, `BaseTextarea`, `BaseSelect`, `BaseMultiselect`, `BaseDateInput`, `BaseTimeInput`, `BaseDateRangeInput`, `BaseTimeRangeInput`, and `BaseDateTimeRangeInput`
