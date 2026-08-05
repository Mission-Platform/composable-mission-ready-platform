// The `_bg.wasm` binary is inlined as a base64 string default export at tsdown
// build time (see the inline plugin in `tsdown.config.ts`).
declare module "*.wasm" {
  const base64: string;
  export default base64;
}
