---
'@mission-platform/components': patch
---

render the form builder schema preview in a `BaseCodeBlock`

- the inspector's "Schema" tab now displays the generated JSON Schema via `BaseCodeBlock` (with `language="json"`, syntax highlighting, and a copy button) instead of a plain `<pre><code>` block
