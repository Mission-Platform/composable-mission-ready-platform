---
'@mission-platform/wysiwyg': patch
---

Fix the WYSIWYG code-block dialog so the language picker actually drives the embedded Monaco `code` editor's syntax
highlighting instead of being fixed to
`plaintext`. Changing the language now re-highlights the field (and the schema's validator is rebuilt only on a language
change, never per keystroke, so typing stays responsive).
