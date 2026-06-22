---
'@mission-platform/components': minor
---

add the modal overlays

- Migrate the **modal** `Components/Overlays` members `BaseDialog` and `BaseModal` from `@mission-platform/components` to the write-once neutral package. Both render a **native `<dialog>`** driven with `showModal()`/`close()` (top layer, `::backdrop` scrim, focus trap, `Escape`-to-close); `BaseModal` adds a `size` scale (mobile bottom sheet / centred on `sm`+), a body-scroll lock, and a `closeOnEsc` opt-out. The Vue `<Transition>` becomes a CSS `@starting-style` fade, the `header`/`footer` named slots become `MpChild` content props (composing `BaseIconButton`/`BaseTypography`), and `useZIndex`/`useRouterClose` are dropped.
- Update the `Components/Overlays` stories to compose other components from the package (`Button` triggers, `Stack`/`Typography` bodies, `Button` footer actions) and refresh `llms.txt`.
