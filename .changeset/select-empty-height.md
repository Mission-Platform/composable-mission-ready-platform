---
'@mission-platform/components': patch
---

fix(components): keep BaseSelect at a constant height when empty

The select trigger now renders a non-breaking space when there is no
selection and no placeholder, so the field keeps a full line box and no
longer collapses to a reduced height compared to its selected state.
