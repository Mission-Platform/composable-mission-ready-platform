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

// YAML locale resources compiled by `@intlify/unplugin-vue-i18n`.
declare module '*.yaml' {
  const messages: Record<string, unknown>;
  export default messages;
}
