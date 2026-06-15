---
'@mission-platform/components': patch
---

fix(components): stop assistive tech from reaching BaseRating hit targets

`BaseRating`'s interactive (`role="slider"`) mode rendered its mouse hit areas as `<button tabindex="-1">` elements nested inside the slider. A negative `tabindex` removes them from the Tab order but does not stop assistive technologies from focusing/exposing them, and they constituted nested interactive controls (a slider already provides full keyboard control). The hit areas are now plain `aria-hidden="true"` `<span>` elements, removing them from the accessibility tree while preserving the existing click and hover behaviour.
