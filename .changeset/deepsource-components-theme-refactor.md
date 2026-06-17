---
"@mission-platform/components": patch
---

reduce theme composable complexity and add missing doc comments

Splits the higher-complexity theme helpers into smaller documented functions
(`createThemeStore`'s initial-theme resolution and `<meta name="color-scheme">`
sync, plus `useThemeComposer`'s document apply step) and converts the
non-interpolated init-script template literals to plain string literals. No
runtime behaviour changes.
