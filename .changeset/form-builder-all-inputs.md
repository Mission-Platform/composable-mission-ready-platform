---
'@mission-platform/forms-core': minor
'@mission-platform/components': minor
---

support every form input in the form builder palette and inspector

The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text, text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch, date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format), and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`, `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).
