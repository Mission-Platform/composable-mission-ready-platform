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
