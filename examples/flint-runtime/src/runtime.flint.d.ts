import type { FlintAbiManifest } from '@mission-platform/flint';

export interface FlintExports {
  readonly currentTime: () => bigint;
  readonly projectValue: () => number;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
}

export interface FlintDynamicModuleExports {
  readonly shared: {
    readonly sharedValue: () => number;
  };
}

export interface FlintDynamicModuleLoaders {
  readonly shared: () => Promise<FlintDynamicModuleExports['shared']>;
}

export interface FlintImports {
  readonly 'clock.now': {
    readonly now: () => bigint;
  };
  readonly dynamicModules?: FlintDynamicModuleLoaders;
}

export const manifest: FlintAbiManifest;
export function load(imports?: FlintImports): Promise<FlintExports>;
