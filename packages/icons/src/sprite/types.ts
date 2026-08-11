import type { MpChild } from '@mission-platform/forge';

export interface IconSvgNode {
  readonly element: string;
  readonly attributes?: Readonly<Record<string, string | number>>;
  readonly children?: readonly IconSvgNode[];
}

export interface IconSymbolUse {
  readonly symbolId: string;
  readonly transform?: string;
  readonly properties?: Readonly<Record<string, string | number>>;
}

export interface IconSymbolDefinition {
  readonly id: string;
  readonly viewBox: string;
  readonly nodes: readonly IconSvgNode[];
  readonly uses?: readonly IconSymbolUse[];
  readonly category: string;
  readonly subcategory: string;
}

export interface IconSpriteProperties {
  readonly src?: string;
  readonly inline?: boolean;
  readonly children?: MpChild | readonly MpChild[];
}

export interface IconSpriteContextValue {
  readonly src?: string;
}
