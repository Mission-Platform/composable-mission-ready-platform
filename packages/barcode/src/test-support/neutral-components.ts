// Test-only, lightweight stand-in for `@mission-platform/components`.
//
// The neutral `BaseBarcode` imports `BaseButton` / `BaseTypography` from
// `@mission-platform/components`, whose public entry is the *whole* neutral
// component barrel (Monaco editor, Markdown, …). Loading that barrel under
// jsdom in unit tests is heavy and can fail on browser-only dependencies, so
// the package's Vitest config aliases `@mission-platform/components` to this
// module — re-exporting only the two neutral primitives the component actually
// uses, straight from the components package source. This file is never
// shipped; the real per-framework builds import from the built
// `@mission-platform/components/react` / `/vue` subpaths.
export { BaseButton } from '../../../components/src/components/atoms/base-button';
export { BaseTypography } from '../../../components/src/components/atoms/base-typography';
