---
'@mission-platform/components': patch
'@mission-platform/icons': patch
'@mission-platform/forms': patch
'@mission-platform/layouts': patch
---

rename the Storybook top-level sections so the catalogue reflects the package split

The cross-framework catalogue no longer prefixes its sections with `JSX`: the
`JSX Components/<Category>/<Name>` stories are now `Components/<Category>/<Name>`
and the `JSX Icons/<Category>/<Name>` stories are now `Icons/<Category>/<Name>`
(both Vue and React Storybooks). The components extracted into their own packages
get their own top-level Storybook section instead of nesting under `Components`:
`@mission-platform/layouts` stories move to `Layouts/<Name>` and
`@mission-platform/forms` stories move to `Forms/<Name>`.
