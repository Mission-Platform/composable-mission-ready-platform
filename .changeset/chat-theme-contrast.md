---
'@mission-platform/components': patch
---

resolve axe colour-contrast violations in the chat bubble and theme composer stories

The pending chat bubble's `opacity` is raised so its composited text still clears
WCAG AA (4.5:1), and the outgoing bubble now uses the theme-aware
`--mp-color-text-on-primary` token. The `BaseThemeComposer` demo stories use
AA-compliant primary colours.
