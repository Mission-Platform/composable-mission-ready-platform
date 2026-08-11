import { ICON_CATALOG } from '../catalog';

import { ICON_COMPOSITIONS, validateCompositions } from './compositions';

import type { IconSymbolDefinition, IconSvgNode } from './types';

const fallbackNodes: readonly IconSvgNode[] = [
  { element: 'circle', attributes: { cx: 12, cy: 12, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 } },
];

const knownDefinitions: Readonly<Record<string, IconSymbolDefinition>> = {
  'icon-arrow': {
    id: 'icon-arrow',
    viewBox: '0 0 24 24',
    category: 'navigation',
    subcategory: 'controls',
    nodes: [
      { element: 'line', attributes: { x1: 12, x2: 12, y1: 19, y2: 5, stroke: 'currentColor', 'stroke-width': 2 } },
      {
        element: 'polyline',
        attributes: { points: '5,12 12,5 19,12', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
    ],
  },
  'icon-country-globe': {
    id: 'icon-country-globe',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'countries',
    nodes: [
      {
        element: 'circle',
        attributes: { cx: 11, cy: 11, r: 8, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
      {
        element: 'path',
        attributes: {
          d: 'M3 11h16M11 3a12 12 0 0 1 0 16M11 3a12 12 0 0 0 0 16',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.5,
        },
      },
      { element: 'circle', attributes: { cx: 18, cy: 18, r: 4, fill: 'currentColor' } },
    ],
  },
  'icon-globe': {
    id: 'icon-globe',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'geography',
    nodes: [
      {
        element: 'circle',
        attributes: { cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
      {
        element: 'path',
        attributes: {
          d: 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.5,
        },
      },
    ],
  },
  'icon-map-pin': {
    id: 'icon-map-pin',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'geography',
    nodes: [
      {
        element: 'path',
        attributes: {
          d: 'M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
        },
      },
    ],
  },
  'icon-layer': {
    id: 'icon-layer',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'layers',
    nodes: [
      {
        element: 'path',
        attributes: { d: 'm12 3 9 5-9 5-9-5 9-5Z', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
      {
        element: 'path',
        attributes: { d: 'm3 12 9 5 9-5M3 16l9 5 9-5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
    ],
  },
  'icon-map-marker-cluster': {
    id: 'icon-map-marker-cluster',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'markers',
    nodes: [
      {
        element: 'circle',
        attributes: { cx: 9, cy: 9, r: 5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
      {
        element: 'circle',
        attributes: {
          cx: 15,
          cy: 15,
          r: 6,
          fill: 'currentColor',
          'fill-opacity': '.2',
          stroke: 'currentColor',
          'stroke-width': 2,
        },
      },
      { element: 'path', attributes: { d: 'M15 12v6M12 15h6', stroke: 'currentColor', 'stroke-width': 2 } },
    ],
  },
  'icon-undo': {
    id: 'icon-undo',
    viewBox: '0 0 24 24',
    category: 'content',
    subcategory: 'editing',
    nodes: [
      {
        element: 'path',
        attributes: {
          d: 'M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': 2,
        },
      },
    ],
  },
  'icon-redo': {
    id: 'icon-redo',
    viewBox: '0 0 24 24',
    category: 'content',
    subcategory: 'editing',
    nodes: [
      {
        element: 'path',
        attributes: {
          d: 'm15 7 5 5-5 5M20 12H10a6 6 0 0 0-6 6',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': 2,
        },
      },
    ],
  },
  'icon-route': {
    id: 'icon-route',
    viewBox: '0 0 24 24',
    category: 'routing',
    subcategory: 'directions',
    nodes: [
      {
        element: 'path',
        attributes: { d: 'M5 19c4-8 5-10 9-10h5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
      { element: 'circle', attributes: { cx: 5, cy: 19, r: 2, fill: 'currentColor' } },
      { element: 'path', attributes: { d: 'm16 6 3 3-3 3', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 } },
    ],
  },
  'icon-waypoint': {
    id: 'icon-waypoint',
    viewBox: '0 0 24 24',
    category: 'routing',
    subcategory: 'directions',
    nodes: [
      {
        element: 'path',
        attributes: {
          d: 'M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
        },
      },
    ],
  },
};

const countryFlagPalette = [
  ['AU', ['#1f3c88', '#ffffff', '#c8102e']],
  ['BR', ['#009c3b', '#ffdf00', '#002776']],
  ['CA', ['#d52b1e', '#ffffff', '#d52b1e']],
  ['DE', ['#000000', '#dd0000', '#ffce00']],
  ['FR', ['#0055a4', '#ffffff', '#ef4135']],
  ['GB', ['#012169', '#ffffff', '#c8102e']],
  ['IN', ['#ff9933', '#ffffff', '#128807']],
  ['JP', ['#ffffff', '#bc002d', '#ffffff']],
  ['US', ['#b22234', '#ffffff', '#3c3b6e']],
  ['ZA', ['#007749', '#ffb81c', '#de3831']],
] as const;

const countryFlagDefinitions: readonly IconSymbolDefinition[] = countryFlagPalette.map(([countryCode, colors]) =>
  createCountryFlagDefinition(countryCode, colors),
);

const countryGlobeDefinitions: readonly IconSymbolDefinition[] = countryFlagPalette.map(([countryCode]) => ({
  id: `icon-country-globe-${countryCode}`,
  viewBox: '0 0 24 24',
  category: 'maps',
  subcategory: 'countries',
  nodes: [],
  uses: [
    { symbolId: 'icon-country-globe' },
    { symbolId: `icon-flag-${countryCode}`, transform: 'translate(13 13) scale(.45)' },
  ],
}));

function createCountryFlagDefinition(
  countryCode: string,
  colors: readonly [string, string, string],
): IconSymbolDefinition {
  const nodes: IconSvgNode[] = [
    { element: 'rect', attributes: { x: 1, y: 4, width: 22, height: 16, rx: 2, fill: colors[0] } },
    { element: 'rect', attributes: { x: 1, y: 9.33, width: 22, height: 5.33, fill: colors[1] } },
    { element: 'rect', attributes: { x: 1, y: 14.67, width: 22, height: 5.33, fill: colors[2] } },
  ];
  if (countryCode === 'JP') {
    nodes.push({ element: 'circle', attributes: { cx: 12, cy: 12, r: 3, fill: colors[1] } });
  }
  return { id: `icon-flag-${countryCode}`, viewBox: '0 0 24 24', category: 'maps', subcategory: 'countries', nodes };
}

const catalogDefinitions: readonly IconSymbolDefinition[] = [
  ...ICON_CATALOG.map((entry) => {
    const id = entry.name.replace(/^forge-/, '');
    return (
      knownDefinitions[id] ?? {
        id,
        viewBox: '0 0 24 24',
        nodes: fallbackNodes,
        category: entry.category,
        subcategory: entry.subcategory,
      }
    );
  }),
  ...countryFlagDefinitions,
  ...countryGlobeDefinitions,
];

const availableIds = new Set(catalogDefinitions.map((definition) => definition.id));
validateCompositions(ICON_COMPOSITIONS, availableIds);

export const ICON_SYMBOL_DEFINITIONS: readonly IconSymbolDefinition[] = [...catalogDefinitions, ...ICON_COMPOSITIONS];

export const COUNTRY_FLAG_SYMBOL_IDS = ['AU', 'BR', 'CA', 'DE', 'FR', 'GB', 'IN', 'JP', 'US', 'ZA'].map(
  (countryCode) => `icon-flag-${countryCode}`,
);
