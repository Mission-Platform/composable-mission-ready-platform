---
'@mission-platform/components': minor
---

add timeline, QR code, OTP input, min/max range input, masonry, and chat components

- `BaseTimeline` + `BaseTimelineItem`: ordered, chronological event list (vertical/horizontal, optional alternating layout) built from semantic `<ol>`/`<li>`.
- `BaseQrCode`: scannable QR Code rendered as a compact SVG by a bundled, dependency-free encoder (byte mode, automatic version selection, lowest-penalty mask).
- `BaseOtpInput`: segmented one-time-password / verification-code field with auto-advance, paste distribution, masking, and character-set validation, wrapped in a semantic `<fieldset>`.
- `BaseRangeInput`: dual-thumb min/max range selector with ordered non-crossing thumbs and an optional `minDistance`.
- `BaseMasonry`: CSS multi-column masonry layout with fixed `columns` or responsive `minColumnWidth`.
- `BaseChatArea` + `BaseChatBubble`: scrollable, auto-scrolling conversation surface and message bubbles using semantic `<ul>`/`<li>`.

Also prefer semantic HTML over ARIA roles where a native element exists (e.g. removed the redundant `role="button"` from the accordion `<summary>`).
