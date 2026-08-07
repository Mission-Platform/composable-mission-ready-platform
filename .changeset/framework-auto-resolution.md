---
'@mission-platform/vite-config': minor
'@mission-platform/typescript-config': minor
'@mission-platform/barcode': minor
'@mission-platform/breakpoints': minor
'@mission-platform/code-scanner': minor
'@mission-platform/components': minor
'@mission-platform/d3': minor
'@mission-platform/forms': minor
'@mission-platform/i18n': minor
'@mission-platform/icons': minor
'@mission-platform/layouts': minor
'@mission-platform/map': minor
'@mission-platform/matrix-code': minor
'@mission-platform/qr-code': minor
'@mission-platform/router': minor
'@mission-platform/rxjs': minor
'@mission-platform/wysiwyg': minor
---

add framework auto-resolution via custom export conditions

Every framework-shipping `@mission-platform/*` package now declares `mp:vue`,
`mp:react`, `mp:solid`, and `mp:web-component` custom export
conditions on its bare `.` entry (each resolving to the matching built `dist`
artifact), so consumers can `import { X } from '@mission-platform/<pkg>'` with
no framework subpath and have Vite and the TypeScript LSP resolve the correct
framework build from a single app-level setting.

`@mission-platform/vite-config` adds `defineFrameworkAppConfig`,
`frameworkResolveConditions`, and `frameworkCondition` (plus the
`MissionPlatformFramework` type) to set `resolve.conditions` from one
`framework` option, and `@mission-platform/typescript-config` adds matching
`framework-vue`, `framework-react`, `framework-solid`, and `framework-web-component`
presets wiring the equivalent `customConditions`.
