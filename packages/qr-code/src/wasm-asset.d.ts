// Ambient type for the wasm asset imported with Vite's `?url` suffix. During a
// production build the query resolves to an inlined base64 `data:` URI (see the
// raised `assetsInlineLimit` in `vite.config.ts`); in dev/test it is a plain
// URL string. Either way the default export is a `string`.
declare module '*.wasm?url' {
  const source: string;
  export default source;
}
