import type { FigmaVariableBinding } from '@mission-platform/forge-figma';

export interface FigmaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

export interface FigmaPaint {
  readonly type: string;
  readonly visible?: boolean;
  readonly color?: FigmaColor;
  readonly opacity?: number;
  readonly imageReference?: string;
  readonly gradientStops?: readonly { readonly position: number; readonly color: FigmaColor }[];
}

export interface FigmaEffect {
  readonly type: string;
  readonly visible?: boolean;
  readonly color?: FigmaColor;
  readonly offset?: { readonly x: number; readonly y: number };
  readonly radius?: number;
  readonly spread?: number;
}

export interface FigmaVariableAlias {
  readonly type: 'VARIABLE_ALIAS';
  readonly id: string;
}

export type FigmaBoundVariable = FigmaVariableAlias | { readonly id: string };

export interface FigmaComponentProperty {
  readonly type: string;
  readonly value: boolean | string;
  readonly defaultValue?: boolean | string;
}

export interface FigmaComponentReference {
  readonly name?: string;
}

export interface FigmaNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly visible?: boolean;
  readonly children?: readonly FigmaNode[];
  readonly width?: number;
  readonly height?: number;
  readonly x?: number;
  readonly y?: number;
  readonly absoluteBoundingBox?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly relativeTransform?: readonly (readonly number[])[];
  readonly layoutMode?: string;
  readonly layoutSizingHorizontal?: string;
  readonly layoutSizingVertical?: string;
  readonly primaryAxisSizingMode?: string;
  readonly counterAxisSizingMode?: string;
  readonly itemSpacing?: number;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
  readonly primaryAxisAlignItems?: string;
  readonly counterAxisAlignItems?: string;
  readonly layoutWrap?: string;
  readonly fills?: readonly FigmaPaint[];
  readonly strokes?: readonly FigmaPaint[];
  readonly strokeWeight?: number;
  readonly strokeAlign?: string;
  readonly dashPattern?: readonly number[];
  readonly cornerRadius?: number;
  readonly topLeftRadius?: number;
  readonly topRightRadius?: number;
  readonly bottomRightRadius?: number;
  readonly bottomLeftRadius?: number;
  readonly effects?: readonly FigmaEffect[];
  readonly opacity?: number;
  readonly blendMode?: string;
  readonly constraints?: { readonly horizontal: string; readonly vertical: string };
  readonly characters?: string;
  readonly textStyle?: Readonly<Record<string, string | number | boolean>>;
  readonly textAlignHorizontal?: string;
  readonly componentProperties?: Readonly<Record<string, FigmaComponentProperty>>;
  readonly mainComponent?: FigmaComponentReference;
  readonly boundVariables?: Readonly<Record<string, FigmaBoundVariable | readonly FigmaBoundVariable[]>>;
  readonly getPluginData?: (key: string) => string;
  readonly getSharedPluginData?: (namespace: string, key: string) => string;
}

export interface FigmaImageBytes {
  readonly content: Uint8Array;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface FigmaExtractionOptions {
  readonly fileKey?: string;
  readonly resolveVariable?: (id: string) => FigmaVariableBinding | undefined;
  readonly loadImage?: (imageReference: string, node: FigmaNode) => Promise<FigmaImageBytes | undefined>;
}

export interface FigmaSelectionHost {
  readonly currentPage: { readonly selection: readonly FigmaNode[] };
  readonly ui: {
    readonly postMessage: (message: unknown) => void;
    onmessage?: (message: unknown) => void | Promise<void>;
  };
  readonly showUI: (html: string, options?: Readonly<Record<string, number | boolean>>) => void;
  readonly clientStorage?: {
    readonly getAsync: (key: string) => Promise<unknown>;
    readonly setAsync: (key: string, value: unknown) => Promise<void>;
  };
  readonly on?: (event: 'selectionchange', callback: () => void) => void;
  readonly onSelectionChange?: (callback: () => void) => void;
  readonly fileKey?: string;
  readonly resolveVariable?: FigmaExtractionOptions['resolveVariable'];
  readonly loadImage?: FigmaExtractionOptions['loadImage'];
}
