interface ForgeWebScriptVirtualManifest {
  readonly [key: string]: unknown;
}

interface ForgeWebScriptVirtualExports {
  readonly [key: string]: unknown;
}

declare module '*.fws' {
  export const manifest: ForgeWebScriptVirtualManifest;
  export const abiManifest: ForgeWebScriptVirtualManifest;
  export function load<TExports extends ForgeWebScriptVirtualExports = ForgeWebScriptVirtualExports>(
    imports?: Record<string, Record<string, (...arguments_: readonly unknown[]) => unknown>>,
  ): Promise<TExports>;
  export function loadSync<TExports extends ForgeWebScriptVirtualExports = ForgeWebScriptVirtualExports>(
    imports?: Record<string, Record<string, (...arguments_: readonly unknown[]) => unknown>>,
  ): TExports;
}

declare module '*.fws?forge-web-script-manifest' {
  const manifest: ForgeWebScriptVirtualManifest;
  export { manifest };
  export default manifest;
}

declare module '*.fws?forge-web-script-declarations' {
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: 'static' | 'dynamic';
    readonly linkedModules?: readonly string[];
  };
  export const selfHostedMetadata: unknown;
  export default declarations;
}

declare module '*.fws?forge-web-script-wasm' {
  const wasm: Uint8Array;
  export default wasm;
}

declare module '*.fws?forge-web-script-artifact' {
  export const wasm: Uint8Array;
  export const manifest: ForgeWebScriptVirtualManifest;
  export const declarations: string;
  export const graphMetadata: {
    readonly contentHash: string;
    readonly graphHash?: string;
    readonly linkMode?: 'static' | 'dynamic';
    readonly linkedModules?: readonly string[];
  };
}

declare module '*.fws?forge-web-script-source-map' {
  const sourceMap: {
    readonly sourcesContent?: readonly string[];
    readonly [key: string]: unknown;
  };
  export { sourceMap };
  export default sourceMap;
}
