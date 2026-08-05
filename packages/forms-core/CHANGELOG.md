# @mission-platform/forms-core

## 0.2.0

### Minor Changes

- edb785f: support every form input in the form builder palette and inspector

  The builder palette (`DEFAULT_FIELD_TYPES`) now offers every `FormFieldType` the schema-driven form can render — text,
  text area, markdown, email, password, url, tel, number, number stepper, select, multi-select, radio, checkbox, switch,
  date, time, date-time, the date/time/date-time ranges, file upload and location — alongside the grouping field set and
  the multi-step wizard. The inspector gains input-specific editors (multi-line rows, text length/pattern, number
  step/integer/unsigned, date min/max bounds, show-seconds, file accept/multiple, and the location coordinate format),
  and `@mission-platform/forms-core` exposes new widget-classifier helpers (`isTextWidget`, `isMultilineWidget`,
  `isDateWidget`, `isTimeWidget`, `isFileWidget`, `isLocationWidget`).

- edb785f: add the framework-agnostic forms core (JSON Schema → field derivation + Ajv validation,
  conditional-visibility evaluation, and the form-builder field ⇄ schema model) shared by the Vue
  `@mission-platform/components` and the write-once `@mission-platform/components` SchemaForm/FormBuilder

### Patch Changes

- eefe5d0: bump nanoid and other shared dependencies to their latest patch releases
- d39b6fc: add per-workspace reference documentation and refresh llms.txt/README metadata
