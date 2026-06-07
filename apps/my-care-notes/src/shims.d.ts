// Allow side-effect CSS/SCSS imports from workspace packages
declare module '@mission-platform/components/styles' {}
declare module '@mission-platform/tokens/scss/tokens' {}
declare module '@mission-platform/tokens/scss/themes/light' {}
declare module '@mission-platform/tokens/scss/themes/dark' {}

// Raw YAML imports via Vite's ?raw query.
declare module '*.yaml?raw' {
  const src: string;
  export default src;
}
