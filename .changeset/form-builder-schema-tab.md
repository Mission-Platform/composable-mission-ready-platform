---
'@mission-platform/components': minor
---

add a Schema tab to BaseFormBuilder showing the emitted JSON Schema

- the centre tab strip now has a third **Schema** tab next to **Editor** and **Preview**, rendering the builder's emitted definition as pretty-printed JSON via `BaseCodeBlock` (with syntax highlighting and line numbers)
- the JSON stays in sync with the form as you build it, so you can inspect or copy the schema the builder produces
