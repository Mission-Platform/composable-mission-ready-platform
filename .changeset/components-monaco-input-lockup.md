---
'@mission-platform/components': patch
---

Fix `ForgeMonacoEditor` locking up on input (Vue). Two changes:

- The editor no longer freezes the browser when typing into it (observed via the
  schema-form `code` field / WYSIWYG code-block dialog). The root cause was in the
  JSX→Vue compiler (`useRef` deep-proxying the editor instance); this build picks
  up the `@mission-platform/vite-plugin-forge` fix that maps `useRef` to
  `shallowRef`, so the Monaco instance is no longer wrapped in Vue reactivity.
- Defensive: the value-mirror effect now suppresses the `onDidChangeModelContent`
  event that its own programmatic `setValue` fires, so an incoming `modelValue` is
  never immediately re-emitted back out as `update:modelValue`.
