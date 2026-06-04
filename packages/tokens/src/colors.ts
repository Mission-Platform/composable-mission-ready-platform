// ─── Colour tokens (JavaScript/TypeScript) ────────────────────────────────────
// Mirrors the SCSS primitive palette as plain JS values.
// Use these in charts, canvas, or any non-CSS context.

export const colors = {
  black: '#000',
  white: '#fff',

  neutral: {
    50: '#f9f9fb',
    100: '#f2f2f5',
    200: '#e5e4e7',
    300: '#c8c7cc',
    400: '#9e9ca4',
    500: '#6b6375',
    600: '#504b5c',
    700: '#3a3545',
    800: '#211e2c',
    900: '#08060d',
  },

  primaryLight: '#fbfbf8',
  primaryDark: '#6b6e6f',

  cyan: {
    50: '#ebfffe',
    100: '#cdfefb',
    200: '#9efaf5',
    300: '#5af2ea',
    400: '#1ae6db',
    500: '#14b8af',
    600: '#0f8a83',
    700: '#0b6560',
    800: '#07403d',
    900: '#042523',
  },

  primary: {
    50: '#f4f0ff',
    100: '#e5d9ff',
    200: '#c9b4ff',
    300: '#a97fff',
    400: '#8a52f5',
    500: '#6c2fd4',
    600: '#5420a8',
    700: '#3d1680',
    800: '#280e56',
    900: '#14072c',
  },

  success: {
    50: '#edfaf2',
    100: '#d0f4df',
    200: '#9ae8ba',
    300: '#5dd891',
    400: '#2cc46e',
    500: '#1aa354',
    600: '#138040',
    700: '#0d5e2e',
    800: '#073d1d',
    900: '#031e0e',
  },

  warning: {
    50: '#fffaeb',
    100: '#fef0c7',
    200: '#fedf89',
    300: '#fec84b',
    400: '#fdb022',
    500: '#f79009',
    600: '#dc6803',
    700: '#b54708',
    800: '#93370d',
    900: '#7a2e0e',
  },

  danger: {
    50: '#fff1f3',
    100: '#ffe4e8',
    200: '#fecdd6',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },

  info: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
} as const;

export type Colors = typeof colors;
