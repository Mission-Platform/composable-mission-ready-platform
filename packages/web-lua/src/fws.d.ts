type ForgeWebScriptVirtualManifest =
  import("@mission-platform/forge-web-script").ForgeWebScriptAbiManifest;

declare module "*.fws?forge-web-script-manifest" {
  const manifest: ForgeWebScriptVirtualManifest;
  export { manifest };
  export default manifest;
}

declare module "*.fws?forge-web-script-declarations" {
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: "static" | "dynamic";
    readonly linkedModules?: readonly string[];
  };
  export const selfHostedMetadata: unknown;
  export default declarations;
}

declare module "*.fws?forge-web-script-wasm" {
  const wasm: Uint8Array;
  export default wasm;
}

declare module "*.fws?forge-web-script-artifact" {
  export const wasm: Uint8Array;
  export const manifest: ForgeWebScriptVirtualManifest;
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: "static" | "dynamic";
    readonly linkedModules?: readonly string[];
  };
}
