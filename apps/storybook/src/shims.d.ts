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

// Virtual locale modules.
declare module 'virtual:i18n-resources' {
  import type { Resource } from 'i18next';
  export const resources: Resource;
}

// Virtual locale modules.
declare module 'virtual:i18n-locale-*' {
  import type { Resource } from 'i18next';
  export const resources: Resource;
}
