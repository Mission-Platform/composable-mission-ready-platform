---
'@mission-platform/wysiwyg': minor
'@mission-platform/icons': minor
---

Add `@mission-platform/wysiwyg`, a framework-agnostic (write-once Vue 3 + React) WYSIWYG rich-text editor.

The editor is authored once with `@mission-platform/forge` and composes existing packages: a `contenteditable` surface with a formatting toolbar built from `@mission-platform/icons` and `@mission-platform/components`' `ForgeButton`, an optional Monaco-backed HTML source view (`ForgeMonacoEditor` with Hunspell + Harper spell/grammar checking), design tokens via `@mission-platform/tokens`, and an RxJS-powered live word/character counter.

Also adds two new icons to `@mission-platform/icons` used by the editor toolbar: `IconUnderline` and `IconStrikethrough`.
