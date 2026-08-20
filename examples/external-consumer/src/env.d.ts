interface ImportMetaEnv {
  readonly VITE_MAILPIT_UI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@mission-platform/tokens/scss/tokens' {}