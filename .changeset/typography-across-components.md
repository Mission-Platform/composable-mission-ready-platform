---
'@mission-platform/components': patch
---

use BaseTypography for presentational text across components

Replace raw `<h2>`/`<h3>`/`<p>`/`<legend>`/`<strong>` text markup with `BaseTypography` (variant/weight/color props) in `BaseFieldSet`, the form-builder family (`BaseFormBuilder`, palette, steps editor, canvas item, field editor, field set), `BaseSchemaForm`'s datetime field, `BaseVirtualTableFooter`, and `BaseFileInput`, and drop the now-redundant font CSS those elements carried.
