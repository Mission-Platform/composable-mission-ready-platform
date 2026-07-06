// Type shims for side-effect imports used in preview.ts.
// These are resolved and processed by Vite at runtime; TypeScript only needs
// to know the modules exist (no runtime value is imported from them).

declare module '*.css' {}
declare module '*.scss' {}

declare module '@mission-platform/tokens/scss/tokens' {}
declare module '@mission-platform/tokens/scss/themes/light' {}
declare module '@mission-platform/tokens/scss/themes/dark' {}
declare module '@mission-platform/components/styles' {}

// English locale bundle imported as a raw string and parsed with js-yaml.
declare module '*.yaml?raw' {
  const source: string;
  export default source;
}
