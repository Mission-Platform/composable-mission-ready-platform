---
'@mission-platform/components': minor
---

migrate the Tier-2 components from `@mission-platform/components` to the write-once neutral JSX package, compiling straight to both React and Vue

Adds `BaseRadioGroup`, `BaseAccordion`, `BaseTimeline`, `BaseSelect`, `BaseMultiselect`, `BaseChatArea`, and `BaseCarousel`. Compound parent/child SFCs (`BaseAccordion`/`BaseAccordionItem`, `BaseTimeline`/`BaseTimelineItem`) and slot-introspecting components (`BaseCarousel`) are flattened into a single `items`/`slides`-array component (the `BaseTabs` approach), with `provide`/`inject` replaced by internal `useState`. `BaseSelect`/`BaseMultiselect` substitute the Teleport + floating-ui `BaseDropdown` with an in-place absolutely-positioned listbox toggled by `useState` (keeping the hidden native `<select>` for autofill), and `BaseChatArea` reproduces its `ResizeObserver` auto-scroll with a single `useEffect`.
