export type ForgeThemeMode = 'light' | 'dark';

export interface ForgeTokenReference {
  readonly path: string;
  readonly cssVariable: string;
  readonly modes: readonly ForgeThemeMode[];
  readonly collection?: string;
  readonly sourceName?: string;
  readonly aliasPath?: string;
}

export interface ForgeTokenFallback {
  readonly value: string | number;
  readonly reason: 'missing-path' | 'unsupported-collection' | 'unresolved-alias' | 'raw-value';
}
