import { ICON_CATALOG } from '../catalog';

import { ICON_COMPOSITIONS, validateCompositions } from './compositions';
import { ICON_GEOMETRY } from './geometry';

import type { IconSymbolDefinition, IconSvgNode } from './types';

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
  'icon-flag': {
    id: 'icon-flag',
    viewBox: '0 0 24 24',
    category: 'maps',
    subcategory: 'countries',
    nodes: [
      {
        element: 'path',
        attributes: { d: 'M5 22V3m0 0h11l-2 4 2 4H5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 },
      },
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
  ['CN', ['#de2910', '#ffde00', '#de2910']],
  ['DE', ['#000000', '#dd0000', '#ffce00']],
  ['ES', ['#aa151b', '#f1bf00', '#aa151b']],
  ['FR', ['#0055a4', '#ffffff', '#ef4135']],
  ['GB', ['#012169', '#ffffff', '#c8102e']],
  ['IL', ['#ffffff', '#0038b8', '#ffffff']],
  ['IN', ['#ff9933', '#ffffff', '#128807']],
  ['IT', ['#009246', '#ffffff', '#ce2b37']],
  ['JP', ['#ffffff', '#bc002d', '#ffffff']],
  ['KR', ['#ffffff', '#cd2e3a', '#0047a0']],
  ['NL', ['#ae1c28', '#ffffff', '#21468b']],
  ['SA', ['#006c35', '#ffffff', '#006c35']],
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
  const nodes = createCountryFlagNodes(countryCode, colors);
  return { id: `icon-flag-${countryCode}`, viewBox: '0 0 24 24', category: 'maps', subcategory: 'countries', nodes };
}

function createCountryFlagNodes(countryCode: string, colors: readonly [string, string, string]): IconSvgNode[] {
  const frame = { element: 'rect', attributes: { x: 1, y: 4, width: 22, height: 16, rx: 2 } } as const;

  switch (countryCode) {
    case 'AU': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'rect', attributes: { x: 1, y: 4, width: 11, height: 8, fill: colors[0] } },
        { element: 'polygon', attributes: { points: '1,4 2.4,4 12,10.6 12,12 10.6,12 1,5.4', fill: colors[1] } },
        { element: 'polygon', attributes: { points: '12,4 10.6,4 1,10.6 1,12 2.4,12 12,5.4', fill: colors[1] } },
        { element: 'rect', attributes: { x: 5.1, y: 4, width: 1.8, height: 8, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 7.1, width: 11, height: 1.8, fill: colors[1] } },
        { element: 'polygon', attributes: { points: '1,4 1.7,4 6,7 6,8 5.3,8 1,5', fill: colors[2] } },
        { element: 'polygon', attributes: { points: '12,4 11.3,4 7,7 7,8 7.7,8 12,5', fill: colors[2] } },
        { element: 'polygon', attributes: { points: '1,12 1,11.3 5.3,8 6,8 6,9 1.7,12', fill: colors[2] } },
        { element: 'polygon', attributes: { points: '12,12 12,11.3 7.7,8 7,8 7,9 11.3,12', fill: colors[2] } },
        { element: 'rect', attributes: { x: 5.6, y: 4, width: 0.8, height: 8, fill: colors[2] } },
        { element: 'rect', attributes: { x: 1, y: 7.6, width: 11, height: 0.8, fill: colors[2] } },
        { element: 'polygon', attributes: { points: createStarPoints(4.2, 16.4, 2, 0.85, 7), fill: colors[1] } },
        { element: 'polygon', attributes: { points: createStarPoints(17.2, 8.2, 1.2, 0.5), fill: colors[1] } },
        { element: 'polygon', attributes: { points: createStarPoints(19.5, 12, 1.2, 0.5), fill: colors[1] } },
        { element: 'polygon', attributes: { points: createStarPoints(17.2, 15.8, 1.2, 0.5), fill: colors[1] } },
        { element: 'polygon', attributes: { points: createStarPoints(14.8, 12, 0.9, 0.38), fill: colors[1] } },
      ];
    }
    case 'BR': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'polygon', attributes: { points: '12,5 21,12 12,19 3,12', fill: colors[1] } },
        { element: 'circle', attributes: { cx: 12, cy: 12, r: 3.2, fill: colors[2] } },
      ];
    }
    case 'CN': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        {
          element: 'polygon',
          attributes: {
            points: '5.5,6 6.3,8.3 8.7,8.3 6.8,9.7 7.5,12 5.5,10.6 3.5,12 4.2,9.7 2.3,8.3 4.7,8.3',
            fill: colors[1],
          },
        },
      ];
    }
    case 'FR':
    case 'IT': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'rect', attributes: { x: 8.33, y: 4, width: 7.34, height: 16, fill: colors[1] } },
        { element: 'rect', attributes: { x: 15.67, y: 4, width: 7.33, height: 16, fill: colors[2] } },
      ];
    }
    case 'IL': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'rect', attributes: { x: 1, y: 5.5, width: 22, height: 2, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 16.5, width: 22, height: 2, fill: colors[1] } },
        {
          element: 'polygon',
          attributes: {
            points: '12,8.8 13,10.5 15,10.5 13.4,11.7 14,13.6 12,12.5 10,13.6 10.6,11.7 9,10.5 11,10.5',
            fill: colors[1],
          },
        },
      ];
    }
    case 'JP': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'circle', attributes: { cx: 12, cy: 12, r: 3.5, fill: colors[1] } },
      ];
    }
    case 'KR': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        {
          element: 'path',
          attributes: { d: 'M12 8.5a3.5 3.5 0 1 1 0 7 1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 1 1 0-3.5Z', fill: colors[1] },
        },
        {
          element: 'path',
          attributes: { d: 'M12 8.5a3.5 3.5 0 1 0 0 7 1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 1 0 0-3.5Z', fill: colors[2] },
        },
      ];
    }
    case 'SA': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        {
          element: 'path',
          attributes: {
            d: 'M5 12h14',
            fill: 'none',
            stroke: colors[1],
            'stroke-linecap': 'round',
            'stroke-width': 1.2,
          },
        },
      ];
    }
    case 'US': {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'rect', attributes: { x: 1, y: 6, width: 22, height: 1.5, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 9, width: 22, height: 1.5, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 12, width: 22, height: 1.5, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 15, width: 22, height: 1.5, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 4, width: 9, height: 8, fill: colors[2] } },
      ];
    }
    default: {
      return [
        { ...frame, attributes: { ...frame.attributes, fill: colors[0] } },
        { element: 'rect', attributes: { x: 1, y: 9.33, width: 22, height: 5.34, fill: colors[1] } },
        { element: 'rect', attributes: { x: 1, y: 14.67, width: 22, height: 5.33, fill: colors[2] } },
      ];
    }
  }
}

function createStarPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  pointCount = 5,
): string {
  return Array.from({ length: pointCount * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / pointCount;
    return `${(centerX + Math.cos(angle) * radius).toFixed(2)},${(centerY + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

const catalogDefinitions: readonly IconSymbolDefinition[] = [
  ...ICON_CATALOG.map((entry) => {
    const id = entry.name.replace(/^forge-/, '');
    const knownDefinition = knownDefinitions[id];
    const nodes = knownDefinition?.nodes ?? ICON_GEOMETRY[id];
    if (nodes === undefined) {
      throw new Error(`[icons] Missing geometry for catalog entry ${id}`);
    }
    return (
      knownDefinition ?? {
        id,
        viewBox: '0 0 24 24',
        nodes,
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

export const COUNTRY_FLAG_SYMBOL_IDS = countryFlagPalette.map(([countryCode]) => `icon-flag-${countryCode}`);
