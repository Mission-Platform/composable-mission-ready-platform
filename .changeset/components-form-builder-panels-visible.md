---
'@mission-platform/components': patch
---

fix the form builder rendering only its tab bar in the compiled build

`BaseFormBuilder` passed its palette and inspector to `BaseVerticalLayout` as the `start`/`end` props and the active panel to `BaseTabs` as the `panel` prop. Those targets render through a neutral `<Slot>`, which the Vue Stage-1 compiler turns into a native `<slot>` (read from `useSlots()`), so content supplied as a **prop** from a compiled neutral parent was dropped — only the tab bar showed. `BaseTabs`/`BaseVirtualTabs` now invoke the `panel` render-prop directly (`properties.panel?.({ tab })`) so it stays a real prop on both frameworks, and `BaseFormBuilder` forwards the palette/inspector through `slot="start"`/`slot="end"` marker children (the supported way to fill a named slot). The palette, inspector, Editor/Steps/Preview/Schema panels, and the wizard are now all visible.
