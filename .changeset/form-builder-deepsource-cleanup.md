---
'@mission-platform/components': patch
---

clean up form-builder internals to satisfy DeepSource

Internal-only refactors with no public API or behaviour change, addressing the
DeepSource findings for the form builder and location input:

- decomposed high-complexity helpers (`inferWidget`, `propertyToField`,
  `buildUi`, `builderFieldToProperty`, `moveField`, `updateField`, `resolveDrop`,
  `onDragEnd`) into small, single-purpose functions and lookup maps;
- added the missing `u` flag to the `slugify` regexes and replaced
  non-interpolated template strings with plain string literals;
- added JSDoc to the builder/location-input helper functions and removed a
  redundant `undefined` argument.
