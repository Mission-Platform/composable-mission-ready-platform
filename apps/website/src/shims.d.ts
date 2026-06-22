declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// Allow side-effect CSS/SCSS imports from workspace packages
declare module '@mission-platform/components/styles' {}
declare module '@mission-platform/tokens/scss/tokens' {}
declare module '@mission-platform/tokens/scss/themes/light' {}
declare module '@mission-platform/tokens/scss/themes/dark' {}

// YAML locale resources imported as raw strings and parsed with js-yaml.
declare module '*.yaml?raw' {
  const source: string;
  export default source;
}
