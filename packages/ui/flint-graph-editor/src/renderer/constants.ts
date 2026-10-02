export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;

export const NODE_WIDTH = 220;
export const NODE_HEADER_HEIGHT = 44;
export const PORT_ROW_HEIGHT = 28;

export const COORD_OFFSET = 1_000_000;

export const CATEGORY_RGBA_DARK: Readonly<Record<string, readonly [number, number, number, number]>> = {
  math: [0.345, 0.651, 1, 1],
  logic: [0.82, 0.529, 0.949, 1],
  string: [0.247, 0.725, 0.314, 1],
  flow: [0.337, 0.741, 0.741, 1],
  io: [0.949, 0.6, 0.2, 1],
  memory: [0.961, 0.318, 0.286, 1],
};

export const CATEGORY_RGBA_LIGHT: Readonly<Record<string, readonly [number, number, number, number]>> = {
  math: [0.035, 0.412, 0.855, 1],
  logic: [0.51, 0.22, 0.76, 1],
  string: [0.102, 0.498, 0.216, 1],
  flow: [0.051, 0.518, 0.549, 1],
  io: [0.749, 0.42, 0.051, 1],
  memory: [0.812, 0.133, 0.18, 1],
};

export const PORT_TYPE_RGBA_DARK: Readonly<Record<string, readonly [number, number, number, number]>> = {
  float32: [0.345, 0.651, 1, 1],
  int32: [0.82, 0.529, 0.949, 1],
  string: [0.247, 0.725, 0.314, 1],
  boolean: [0.337, 0.741, 0.741, 1],
};

export const PORT_TYPE_RGBA_LIGHT: Readonly<Record<string, readonly [number, number, number, number]>> = {
  float32: [0.035, 0.412, 0.855, 1],
  int32: [0.51, 0.22, 0.76, 1],
  string: [0.102, 0.498, 0.216, 1],
  boolean: [0.051, 0.518, 0.549, 1],
};

export interface WebGpuNodeStyle {
  readonly border: readonly [number, number, number, number];
  readonly width: number;
  readonly glow: readonly [number, number, number, number];
}

export const GPU_NODE_STYLES_DARK: Readonly<Record<string, WebGpuNodeStyle>> = {
  trapped: { border: [0.97, 0.32, 0.29, 1], width: 2.5, glow: [0.95, 0.15, 0.2, 0.9] },
  active: { border: [0.25, 0.73, 0.31, 1], width: 2.5, glow: [0.15, 0.75, 1, 0.8] },
  selected: { border: [0.35, 0.65, 1, 1], width: 2.5, glow: [0, 0, 0, 0.5] },
  default: { border: [0.28, 0.32, 0.42, 0.7], width: 1.2, glow: [0, 0, 0, 0] },
};

export const GPU_NODE_STYLES_LIGHT: Readonly<Record<string, WebGpuNodeStyle>> = {
  trapped: { border: [0.81, 0.13, 0.18, 1], width: 2.5, glow: [0.81, 0.13, 0.18, 0.9] },
  active: { border: [0.1, 0.5, 0.22, 1], width: 2.5, glow: [0.1, 0.5, 0.22, 0.8] },
  selected: { border: [0.035, 0.412, 0.855, 1], width: 2.5, glow: [0, 0, 0, 0.5] },
  default: { border: [0.816, 0.843, 0.871, 0.7], width: 1.2, glow: [0, 0, 0, 0] },
};

export interface WebGpuEdgeStyle {
  readonly color: readonly [number, number, number, number];
  readonly width: number;
}

export const GPU_EDGE_STYLES_DARK: Readonly<Record<string, WebGpuEdgeStyle>> = {
  selected: { color: [0.35, 0.65, 1, 1], width: 3 },
  active: { color: [0.2, 0.8, 1, 0.9], width: 2.5 },
  default: { color: [0.45, 0.52, 0.65, 0.8], width: 2.5 },
};

export const GPU_EDGE_STYLES_LIGHT: Readonly<Record<string, WebGpuEdgeStyle>> = {
  selected: { color: [0.035, 0.412, 0.855, 1], width: 3 },
  active: { color: [0.1, 0.5, 0.22, 0.9], width: 2.5 },
  default: { color: [0.34, 0.38, 0.42, 0.65], width: 2.5 },
};

export interface WebGpuPinStyle {
  readonly fill: readonly [number, number, number, number];
  readonly border: readonly [number, number, number, number];
  readonly borderWidth: number;
  readonly glow: readonly [number, number, number, number];
}

export const GPU_PIN_STYLES_DARK: Readonly<Record<string, WebGpuPinStyle>> = {
  hovered: { fill: [0, 0.94, 1, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 2.5, glow: [0, 0.94, 1, 0.8] },
  active: { fill: [0, 1, 0.53, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 1.5, glow: [0, 1, 0.53, 0.6] },
  default: { fill: [0.15, 0.2, 0.28, 1], border: [0.45, 0.52, 0.65, 0.8], borderWidth: 1.5, glow: [0, 0, 0, 0] },
};

export const GPU_PIN_STYLES_LIGHT: Readonly<Record<string, WebGpuPinStyle>> = {
  hovered: { fill: [1, 1, 1, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 2.5, glow: [0, 0.41, 0.85, 0.8] },
  active: { fill: [0.1, 0.5, 0.22, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 1.5, glow: [0, 0.5, 0.22, 0.6] },
  default: { fill: [0.94, 0.95, 0.96, 1], border: [0.34, 0.38, 0.42, 0.8], borderWidth: 1.5, glow: [0, 0, 0, 0] },
};

export const GL_NODE_BORDER_DARK: Readonly<Record<string, readonly [number, number, number]>> = {
  selected: [0.35, 0.65, 1],
  trapped: [0.97, 0.32, 0.29],
  active: [0.25, 0.73, 0.31],
  default: [0.22, 0.25, 0.32],
};

export const GL_NODE_BORDER_LIGHT: Readonly<Record<string, readonly [number, number, number]>> = {
  selected: [0.035, 0.412, 0.855],
  trapped: [0.81, 0.13, 0.18],
  active: [0.1, 0.5, 0.22],
  default: [0.816, 0.843, 0.871],
};

export const GL_PIN_COLOR_DARK: Readonly<Record<string, readonly [number, number, number]>> = {
  hovered: [0.47, 0.75, 1],
  active: [0.25, 0.73, 0.31],
  default: [0.55, 0.58, 0.62],
};

export const GL_PIN_COLOR_LIGHT: Readonly<Record<string, readonly [number, number, number]>> = {
  hovered: [0.035, 0.412, 0.855],
  active: [0.1, 0.5, 0.22],
  default: [0.34, 0.38, 0.42],
};

export const C2D_NODE_STROKE_DARK: Readonly<Record<string, { strokeStyle: string; lineWidth: number }>> = {
  selected: { strokeStyle: '#58a6ff', lineWidth: 2 },
  trapped: { strokeStyle: '#f85149', lineWidth: 2 },
  active: { strokeStyle: '#3fb950', lineWidth: 2 },
  default: { strokeStyle: 'rgba(56, 64, 82, 0.8)', lineWidth: 1 },
};

export const C2D_NODE_STROKE_LIGHT: Readonly<Record<string, { strokeStyle: string; lineWidth: number }>> = {
  selected: { strokeStyle: '#0969da', lineWidth: 2 },
  trapped: { strokeStyle: '#cf222e', lineWidth: 2 },
  active: { strokeStyle: '#1a7f37', lineWidth: 2 },
  default: { strokeStyle: '#d0d7de', lineWidth: 1 },
};

export const C2D_PIN_FILL_DARK: Readonly<Record<string, string>> = {
  hovered: '#79c0ff',
  active: '#3fb950',
  default: '#8b949e',
};

export const C2D_PIN_FILL_LIGHT: Readonly<Record<string, string>> = {
  hovered: '#0969da',
  active: '#1a7f37',
  default: '#57606a',
};
