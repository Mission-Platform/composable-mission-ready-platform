# @mission-platform/theme

`@mission-platform/theme` owns the write-once theme surface extracted from `@mission-platform/components`.

## Public surface

- `ForgeThemeToggle` cycles the shared light, dark, and auto preference.
- `ForgeThemeProvider` configures persistence and exposes theme state through its scoped render prop.
- `ForgeThemeComposer` controls scoped or global `--mp-*` token overrides.
- Theme store contracts include `getThemeSnapshot`, `subscribeTheme`, `setTheme`, `toggleTheme`, `cycleTheme`, and
  `configureTheme`.
- Composer contracts include configuration merge, attribute/token mutation, CSS-variable conversion, and reset helpers.

All components and stores use one package-local implementation, so provider, toggle, and composer consumers observe
the same runtime contracts after framework-specific Forge compilation.
