---
'@mission-platform/wysiwyg': minor
---

Extract the status bar into its own customisable component, move block-style formats into a dropdown, insert real code blocks, and add per-block controls.

- **`WysiwygStatusBar`** — the status bar is now its own framework-agnostic, fully customisable component. It shows the live word/character counts by default; pass `items: WysiwygStatusItem[]` (`{ id, label, value? }`) to replace them and `align` to lay them out. The editor forwards a new `statusItems` prop.
- **`WysiwygBlockMenu`** — Paragraph, Headings **1-6**, Block Quote and **Monospace** (an editable `<pre>`) are now chosen from a `BaseDropdown`-backed block-format dropdown instead of buttons. New `heading4`/`heading5`/`heading6`/`monospace` commands and a `queryBlockFormat` helper back it.
- **Code blocks** — the toolbar's code-block control now inserts a **non-editable** block that portals a real `BaseCodeBlock` (from `@mission-platform/components`) into the surface via the neutral `<Teleport>`; the serialized `modelValue` keeps only a clean placeholder.
- **`WysiwygBlockControls`** — hovering a block (or moving the caret into it) now outlines it and shows a floating bar to move the block up/down and change its alignment/justification (toggle with the new `showBlockControls` prop).
