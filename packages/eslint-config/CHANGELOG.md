# @mission-platform/eslint-config

## 0.1.1

### Patch Changes

- 5ed2115: add vue/html-self-closing eslint rule and reformat time column headers
  - add `vue/html-self-closing` rule to eslint-config enforcing `always` self-closing on void, normal, and component elements
  - reformat time column header elements (HH, MM, SS) in BaseTimeInput, BaseTimeRangeInput, and BaseDateTimeRangeInput to comply with the new rule

## 0.1.0

### Minor Changes

- feat: initial ESLint flat config with TypeScript, Vue 3 script-setup and JS rules
