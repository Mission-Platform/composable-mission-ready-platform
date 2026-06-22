---
'@mission-platform/components': patch
---

increase the BaseTypography block spacing by two steps

The per-variant `margin-bottom` in the `BaseTypography` stylesheet is bumped two
spacing steps (`--mp-spacing-1` → `--mp-spacing-3`, `--mp-spacing-2` →
`--mp-spacing-4`, `--mp-spacing-3` → `--mp-spacing-5`), giving headings and body
copy more vertical breathing room. The `label`/`caption`/`code` variants (which
have no block margin) are left untouched, and no design tokens are changed.
