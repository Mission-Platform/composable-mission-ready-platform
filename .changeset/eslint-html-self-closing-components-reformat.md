---
"@mission-platform/eslint-config": patch
"@mission-platform/components": patch
---

add vue/html-self-closing eslint rule and reformat time column headers

- add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component elements
- reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput to comply with the new rule
