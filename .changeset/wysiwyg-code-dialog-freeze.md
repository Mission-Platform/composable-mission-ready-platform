---
'@mission-platform/wysiwyg': patch
---

Fix the WYSIWYG editor locking up when opening the code-block dialog. The
`ForgeSchemaFormDialog` (which embeds a Monaco `code` editor) was rendered unconditionally, so a full Monaco instance
mounted on editor load and was re-patched on every render/keystroke — freezing the tab in the browser (most visibly in
the Vue build). The dialog is now mounted only while it is open, so Monaco is created lazily and torn down on close.
Added a regression test asserting the code dialog is absent from the initial markup.
