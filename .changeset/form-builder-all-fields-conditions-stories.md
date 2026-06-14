---
'@mission-platform/components': patch
---

add form builder stories covering every field type and condition

- add an `AllFieldTypes` story loading a schema with one of every palette field (`text`, `textarea`, `markdown`, `email`, `password`, `url`, `tel`, `number`, `stepper`, `select`, `multiselect`, `radio`, `checkbox`, `switch`, `date`, `time`, `datetime`, `daterange`, `timerange`, `datetimerange`, `location`, `file`, and a nested `fieldset`)
- add a `Conditions` story demonstrating each `ui.visibleWhen` operator (`equals`, `notEquals`, `in`, `contains`, `gt`, `gte`, `lt`, `lte`, `truthy`) and each combinator (`allOf`, `anyOf`, `oneOf`)
