---
'@mission-platform/components': major
---

rename the `BaseTypography` `align` prop to `horizontalAlign` and add a `verticalAlign` prop

The write-once `BaseTypography`'s horizontal alignment prop is now `horizontalAlign` (`start`/`center`/`end` → `text-align`), renamed from `align` to mirror the `@mission-platform/components` `BaseTypography`. The exported `TypographyAlign` type is correspondingly renamed to `TypographyHorizontalAlign`, and the SCSS modifier class moves from `--align-*` to `--halign-*`. A new `verticalAlign` prop (`baseline`/`top`/`middle`/`bottom`/`sub`/`super`/`text-top`/`text-bottom` → `vertical-align`) is added alongside it, with the `TypographyVerticalAlign` type exported and a corresponding `--valign-*` SCSS modifier.

BREAKING CHANGE: the `BaseTypography` `align` prop is renamed to `horizontalAlign`, and the `TypographyAlign` type is renamed to `TypographyHorizontalAlign`.
