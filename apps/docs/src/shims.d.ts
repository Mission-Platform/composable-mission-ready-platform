declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// Allow side-effect CSS/SCSS imports from workspace packages.
declare module '@mission-platform/components/styles' {}
declare module '@mission-platform/tokens/scss/tokens' {}
