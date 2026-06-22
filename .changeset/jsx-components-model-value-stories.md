---
'@mission-platform/components': patch
---

fix the controlled-value round-trip in every story that binds a model value

The components built by `@mission-platform/vite-plugin-jsx` expose their
controlled value as an `onUpdate<Name>` callback prop, so the parent listener
must be the camelised `@update-<name>` form. The stories were using the Vue
`v-model` colon form (`@update:model-value`), which compiles to the
`onUpdate:modelValue` vnode key and never reaches the generated callback prop —
so the value was silently ignored. All controlled-component stories (the entire
`Forms` category plus `BaseCarousel`, `BaseAlertBanner`, `BasePagination`,
`BaseSegmentControl`, `BaseTabs`, and `BaseVirtualTabs`) now use the correct
`@update-model-value` (and `BasePhoneInput`'s `@update-country`,
`BaseFileInput`'s seeded `ref`) so the value actually round-trips in Storybook.
