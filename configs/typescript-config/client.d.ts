/**
 * Repo-owned ambient client types — a framework-neutral replacement for
 * `vite/client`.
 *
 * Mission Platform library packages build with tsdown (not Vite), so they must
 * not depend on the `vite` package for the ambient declarations that source
 * files rely on (asset-query imports, CSS Modules, `import.meta.env`). This
 * file declares that surface and is shipped by `@mission-platform/typescript-config`
 * so packages can reference it via `"types": ["@mission-platform/typescript-config/client"]`
 * instead of `"vite/client"`.
 */

// ── Asset / query-suffixed imports ──────────────────────────────────────────
declare module '*?url' {
  const source: string;
  export default source;
}

declare module '*?raw' {
  const source: string;
  export default source;
}

declare module '*?inline' {
  const source: string;
  export default source;
}

declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*.wasm?url' {
  const source: string;
  export default source;
}

declare module '*.wasm?init' {
  const initWasm: (options?: WebAssembly.Imports) => Promise<WebAssembly.Instance>;
  export default initWasm;
}

// ── Static assets ───────────────────────────────────────────────────────────
declare module '*.svg' {
  const source: string;
  export default source;
}

declare module '*.png' {
  const source: string;
  export default source;
}

declare module '*.jpg' {
  const source: string;
  export default source;
}

declare module '*.webp' {
  const source: string;
  export default source;
}

declare module '*.wasm' {
  const source: string;
  export default source;
}

// ── Style imports ───────────────────────────────────────────────────────────
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// ── import.meta env ─────────────────────────────────────────────────────────
interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
}
