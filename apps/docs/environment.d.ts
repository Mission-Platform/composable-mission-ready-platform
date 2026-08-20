/// <reference types="vite/client" />

declare module '@mission-platform/tokens/scss/tokens' {
  const tokens: unknown;
  export default tokens;
}

declare global {
  interface ForgeRouterOutletElement extends HTMLElement {
    setRouter(router: unknown): void;
  }

  interface HTMLElementTagNameMap {
    'forge-router-outlet': ForgeRouterOutletElement;
  }
}

export {};
