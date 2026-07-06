---
'@mission-platform/jsx': minor
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

add a `hasSlot` slot-presence helper and move the component content props to named slots

`@mission-platform/jsx` now exports `hasSlot('x')` — the neutral counterpart of
Vue's `$slots.x` / a React `properties.x != null` check (an omitted name targets
the default slot) — so a write-once component can render an optional wrapper
region only when a slot is filled. The runtime adapters also gain
`resolveSlotMarkers`, which resolves a forwarded `<Slot>` marker lexically
against the forwarding component before handing children to a child component,
so a component can forward its own slots into a child's slots.

`@mission-platform/vite-plugin-jsx` compiles `hasSlot('x')` to each framework's
native presence check — Vue's `v-if="$slots.x"` (template path) / `!!slots.x`
(render-closure path, pulling in `useSlots()`) and React's `properties.x != null`
— and consumes the `hasSlot` import (never emitting it).

`@mission-platform/components` migrates every component that exposed `MpChild`
content props (`BaseCard`, `BaseDialog`, `BaseModal`, `BaseDrawer`, `BaseHero`,
`BaseAlertBanner`, `BaseToast`, `BaseChatBubble`, `BaseInput`, `BaseTextarea`,
the date/time pickers, `BaseFormWizard`, `BaseWindowPopout`, `BaseVerticalLayout`,
…) to author those regions as named slots (`<Slot>`), gating optional regions
with `hasSlot`. React consumers are unaffected (named slots are props), but Vue
consumers must now pass this content through named slots (`<template #header>`)
rather than props.
