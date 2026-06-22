---
'@mission-platform/components': major
---

rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

`BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` for symmetry with the new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`). The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and `TypographyVerticalAlign` is exported alongside the other typography types. Storybook stories document both alignment axes.

BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.
