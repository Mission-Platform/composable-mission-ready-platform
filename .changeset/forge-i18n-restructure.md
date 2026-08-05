---
'@mission-platform/i18n': major
---

restructure the package into `components`/`composables`/`utils`/`stores` and rebrand the public API from `Mp`/`mp` to `Forge`/`forge`

BREAKING CHANGE: the shipped implementation now adopts the server-context-aware core, and every public symbol is renamed (`MpI18n` → `ForgeI18N`, `MpI18nProvider` → `ForgeI18NProvider`, `createMpI18n` → `createForgeI18N`, `createMpI18nVue` → `createForgeI18NVue`, `mpNamespace` → `forgeNamespace`, `MP_*` → `FORGE_*`, etc.). Consumers must update all imports; runtime namespace string values (`'mp'`) are unchanged.
