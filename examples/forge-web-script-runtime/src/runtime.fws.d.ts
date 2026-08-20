import type { ForgeWebScriptAbiManifest } from '@mission-platform/forge-web-script';

export interface ForgeWebScriptExports {
  readonly currentTime: () => bigint;
  readonly projectValue: () => number;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
}

export interface ForgeWebScriptDynamicModuleExports {
  readonly shared: {
    readonly sharedValue: () => number;
  };
}

export interface ForgeWebScriptDynamicModuleLoaders {
  readonly shared: () => Promise<ForgeWebScriptDynamicModuleExports['shared']>;
}

export interface ForgeWebScriptImports {
  readonly 'clock.now': {
    readonly now: () => bigint;
  };
  readonly dynamicModules?: ForgeWebScriptDynamicModuleLoaders;
}

export const manifest: ForgeWebScriptAbiManifest;
export function load(imports?: ForgeWebScriptImports): Promise<ForgeWebScriptExports>;