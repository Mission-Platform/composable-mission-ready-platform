---
'@mission-platform/wysiwyg': minor
---

Make the WYSIWYG toolbar user configurable and rename the toolbar button's activation callback to `onClick`.

`BaseWysiwygToolbar` now accepts an `items` array of `WysiwygToolbarItem` objects (`{ label, state, disabled, action }`, where `action` is the click handler and an optional `icon` is rendered inside the control). When provided, these replace the built-in formatting controls; the same items can be supplied to `BaseWysiwygEditor` via the new `toolbarItems` prop. `BaseWysiwygToolbarButton` now reports clicks through `onClick` instead of `onActivate`.
