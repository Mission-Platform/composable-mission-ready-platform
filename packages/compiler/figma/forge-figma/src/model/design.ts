import type { ForgeDiagnostic } from './diagnostics';
import type { ForgeTokenReference } from './tokens';

export const FORGE_DESIGN_SCHEMA_VERSION = 1 as const;

export type ForgeDesignNodeType =
  | 'frame'
  | 'group'
  | 'component'
  | 'instance'
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'vector'
  | 'boolean-operation'
  | 'image'
  | 'section'
  | 'unknown';

export type ForgeLayoutMode = 'none' | 'horizontal' | 'vertical' | 'grid';
export type ForgeSizingMode = 'fixed' | 'fill' | 'hug' | 'absolute';
export type ForgeAlignment = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

export interface ForgeSize {
  readonly width: number;
  readonly height: number;
}

export interface ForgeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ForgePoint {
  readonly x: number;
  readonly y: number;
}

export interface ForgeLayout {
  readonly mode: ForgeLayoutMode;
  readonly sizing?: ForgeSizingMode;
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly gap?: number;
  readonly padding?: ForgeInsets;
  readonly align?: ForgeAlignment;
  readonly justify?: ForgeAlignment | 'space-between';
  readonly wrap?: boolean;
  readonly position?: ForgePoint;
}

export type ForgeColor =
  | { readonly kind: 'solid'; readonly color: string; readonly opacity?: number }
  | { readonly kind: 'gradient'; readonly value: string; readonly opacity?: number }
  | { readonly kind: 'image'; readonly assetId?: string; readonly opacity?: number };

export interface ForgeStroke {
  readonly color?: ForgeColor;
  readonly width?: number;
  readonly align?: 'inside' | 'center' | 'outside';
  readonly dashPattern?: readonly number[];
}

export interface ForgeEffect {
  readonly kind: 'drop-shadow' | 'inner-shadow' | 'blur' | 'background-blur' | 'unknown';
  readonly color?: string;
  readonly offset?: ForgePoint;
  readonly radius?: number;
  readonly spread?: number;
  readonly visible?: boolean;
}

export interface ForgeStyle {
  readonly fills?: readonly ForgeColor[];
  readonly strokes?: readonly ForgeStroke[];
  readonly radius?: number | ForgeCornerRadii;
  readonly effects?: readonly ForgeEffect[];
  readonly opacity?: number;
  readonly blendMode?: string;
  readonly tokens?: Readonly<Record<string, ForgeTokenReference>>;
}

export interface ForgeCornerRadii {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

export interface ForgeConstraints {
  readonly horizontal: 'left' | 'right' | 'center' | 'left-right' | 'scale';
  readonly vertical: 'top' | 'bottom' | 'center' | 'top-bottom' | 'scale';
}

export interface ForgeTextContent {
  readonly characters: string;
  readonly style?: Readonly<Record<string, string | number | boolean>>;
  readonly layout?: 'left' | 'center' | 'right' | 'justified';
}

export interface ForgeComponentProperty {
  readonly name: string;
  readonly type: 'boolean' | 'text' | 'instance-swap' | 'variant' | 'unknown';
  readonly value: boolean | string;
  readonly defaultValue?: boolean | string;
}

export interface ForgeComponentBinding {
  readonly registryName: string;
  readonly sourceName?: string;
  readonly variant?: string;
  readonly properties?: readonly ForgeComponentProperty[];
  readonly confidence: 'explicit' | 'metadata';
}

export interface ForgeDesignNode {
  readonly id: string;
  readonly name: string;
  readonly type: ForgeDesignNodeType;
  readonly visible?: boolean;
  readonly layout?: ForgeLayout;
  readonly size?: ForgeSize;
  readonly constraints?: ForgeConstraints;
  readonly style?: ForgeStyle;
  readonly text?: ForgeTextContent;
  readonly component?: ForgeComponentBinding;
  readonly children?: readonly ForgeDesignNode[];
  readonly assetId?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ForgeAsset {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly content: string | Uint8Array;
  readonly width?: number;
  readonly height?: number;
}

export interface ForgeDesignSource {
  readonly fileKey?: string;
  readonly nodeId: string;
  readonly name: string;
}

export interface ForgeDesignDocument {
  readonly schemaVersion: typeof FORGE_DESIGN_SCHEMA_VERSION;
  readonly source: ForgeDesignSource;
  readonly root: ForgeDesignNode;
  readonly assets: readonly ForgeAsset[];
  readonly diagnostics: readonly ForgeDiagnostic[];
}
