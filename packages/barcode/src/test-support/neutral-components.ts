// Test-only, lightweight stand-in for `@mission-platform/components`.
//
// The neutral `ForgeBarcode` imports `ForgeButton` from `@mission-platform/components`,
// whose public entry is the *whole* neutral component barrel (Monaco editor,
// Markdown, …). Loading that barrel under jsdom in unit tests is heavy and can
// fail on browser-only dependencies, so the package's Vitest config aliases
// `@mission-platform/components` to this module — re-exporting only the neutral
// primitive the component actually uses, straight from the components package
// source. This file is never
// shipped; the real per-framework builds import the bare
// `@mission-platform/components` specifier, whose `mp:<framework>` export
// condition resolves to that framework's built barrel.
export { ForgeButton } from '../../../components/src/components/atoms/forge-button';
