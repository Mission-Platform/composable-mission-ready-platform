import type { IconSvgNode } from './types';

export const ICON_GEOMETRY: Readonly<Record<string, readonly IconSvgNode[]>> = {
  'icon-alert-critical': [
    {
      element: 'polygon',
      attributes: {
        points: '7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 8,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 16,
        y2: 16,
      },
    },
  ],
  'icon-alert-info': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 11,
        y2: 16,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 8,
        y2: 8,
      },
    },
  ],
  'icon-alert-neutral': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 8,
        x2: 16,
        y1: 12,
        y2: 12,
      },
    },
  ],
  'icon-alert-warning': [
    {
      element: 'path',
      attributes: {
        d: 'M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 9,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 17,
        y2: 17,
      },
    },
  ],
  'icon-alert': [
    {
      element: 'path',
      attributes: {
        d: 'M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 9,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 17,
        y2: 17,
      },
    },
  ],
  'icon-align-center': [
    {
      element: 'path',
      attributes: {
        d: 'M3 6H21M6 12H18M4 18H20',
      },
    },
  ],
  'icon-align-justify': [
    {
      element: 'path',
      attributes: {
        d: 'M3 6H21M3 12H21M3 18H21',
      },
    },
  ],
  'icon-align-left': [
    {
      element: 'path',
      attributes: {
        d: 'M3 6H21M3 12H15M3 18H18',
      },
    },
  ],
  'icon-align-right': [
    {
      element: 'path',
      attributes: {
        d: 'M3 6H21M9 12H21M6 18H21',
      },
    },
  ],
  'icon-arrow': [
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 19,
        y2: 5,
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '5,12 12,5 19,12',
      },
    },
  ],
  'icon-bell': [
    {
      element: 'path',
      attributes: {
        d: 'M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M13.73 21A2 2 0 0 1 10.27 21',
      },
    },
  ],
  'icon-blockquote': [
    {
      element: 'path',
      attributes: {
        d: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z',
      },
    },
  ],
  'icon-bold': [
    {
      element: 'path',
      attributes: {
        d: 'M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
      },
    },
  ],
  'icon-bullet-list': [
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 20,
        y1: 6,
        y2: 6,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 20,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 20,
        y1: 18,
        y2: 18,
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 4,
        cy: 6,
        fill: 'currentColor',
        r: 1,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 4,
        cy: 12,
        fill: 'currentColor',
        r: 1,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 4,
        cy: 18,
        fill: 'currentColor',
        r: 1,
        stroke: 'none',
      },
    },
  ],
  'icon-calendar': [
    {
      element: 'rect',
      attributes: {
        height: 18,
        rx: 2,
        ry: 2,
        width: 18,
        x: 3,
        y: 4,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 16,
        x2: 16,
        y1: 2,
        y2: 6,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 8,
        x2: 8,
        y1: 2,
        y2: 6,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 21,
        y1: 10,
        y2: 10,
      },
    },
  ],
  'icon-camera': [
    {
      element: 'path',
      attributes: {
        d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 13,
        r: 4,
      },
    },
  ],
  'icon-chat': [
    {
      element: 'path',
      attributes: {
        d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      },
    },
  ],
  'icon-check': [
    {
      element: 'path',
      attributes: {
        d: 'M20 6L9 17L4 12',
      },
    },
  ],
  'icon-chevron': [
    {
      element: 'path',
      attributes: {
        d: 'M6 9L12 15L18 9',
      },
    },
  ],
  'icon-chevrons': [
    {
      element: 'path',
      attributes: {
        d: 'M7 6l6 6-6 6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M13 6l6 6-6 6',
      },
    },
  ],
  'icon-clock': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '12 6 12 12 16 14',
      },
    },
  ],
  'icon-close': [
    {
      element: 'path',
      attributes: {
        d: 'M18 6L6 18M6 6L18 18',
      },
    },
  ],
  'icon-cloud': [
    {
      element: 'path',
      attributes: {
        d: 'M17.5 19a4.5 4.5 0 1 0-1.06-8.875 6 6 0 1 0-10.43 5.34A4 4 0 0 0 7 19h10.5Z',
      },
    },
  ],
  'icon-code-block': [
    {
      element: 'path',
      attributes: {
        d: 'M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3',
      },
    },
    {
      element: 'rect',
      attributes: {
        height: 6,
        rx: 1,
        ry: 1,
        width: 8,
        x: 8,
        y: 2,
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,13 7,15 9,17',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '15,13 17,15 15,17',
      },
    },
  ],
  'icon-code-inline': [
    {
      element: 'polyline',
      attributes: {
        points: '10,8 6,12 10,16',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '14,8 18,12 14,16',
      },
    },
  ],
  'icon-copy': [
    {
      element: 'rect',
      attributes: {
        height: 13,
        rx: 2,
        ry: 2,
        width: 13,
        x: 9,
        y: 9,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M5 15H4A2 2 0 0 1 2 13V4A2 2 0 0 1 4 2H13A2 2 0 0 1 15 4V5',
      },
    },
  ],
  'icon-debug': [
    {
      element: 'path',
      attributes: {
        d: 'M8 6h8',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 12h16',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 18h16',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M12 2v4',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 2,
      },
    },
  ],
  'icon-download': [
    {
      element: 'path',
      attributes: {
        d: 'M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '7,10 12,15 17,10',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 15,
        y2: 3,
      },
    },
  ],
  'icon-draw-circle': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 9,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 12,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 21,
        cy: 12,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'line',
      attributes: {
        'stroke-dasharray': '3,2',
        x1: 12,
        x2: 21,
        y1: 12,
        y2: 12,
      },
    },
  ],
  'icon-draw-line': [
    {
      element: 'polyline',
      attributes: {
        points: '3,19 9,9 15,14 21,5',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 3,
        cy: 19,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 9,
        cy: 9,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 15,
        cy: 14,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 21,
        cy: 5,
        r: 1.5,
        stroke: 'none',
      },
    },
  ],
  'icon-draw-polygon': [
    {
      element: 'polygon',
      attributes: {
        points: '12,3 21,9 18,20 6,20 3,9',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 3,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 21,
        cy: 9,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 18,
        cy: 20,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 6,
        cy: 20,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 3,
        cy: 9,
        r: 1.5,
        stroke: 'none',
      },
    },
  ],
  'icon-draw-square': [
    {
      element: 'rect',
      attributes: {
        height: 18,
        rx: 1,
        width: 18,
        x: 3,
        y: 3,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 3,
        cy: 3,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 21,
        cy: 3,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 21,
        cy: 21,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 3,
        cy: 21,
        r: 1.5,
        stroke: 'none',
      },
    },
  ],
  'icon-draw-triangle': [
    {
      element: 'polygon',
      attributes: {
        points: '12,3 22,20 2,20',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 3,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 22,
        cy: 20,
        r: 1.5,
        stroke: 'none',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 2,
        cy: 20,
        r: 1.5,
        stroke: 'none',
      },
    },
  ],
  'icon-edit': [
    {
      element: 'path',
      attributes: {
        d: 'M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M18.5 2.5A2.121 2.121 0 0 1 21 5L12 14L8 15L9 11Z',
      },
    },
  ],
  'icon-error': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 9,
        y1: 9,
        y2: 15,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 15,
        y1: 9,
        y2: 15,
      },
    },
  ],
  'icon-external-link': [
    {
      element: 'path',
      attributes: {
        d: 'M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '15,3 21,3 21,9',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 10,
        x2: 21,
        y1: 14,
        y2: 3,
      },
    },
  ],
  'icon-eye-off': [
    {
      element: 'path',
      attributes: {
        d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 5.06',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 20.71 15.71',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 1,
        x2: 23,
        y1: 1,
        y2: 23,
      },
    },
  ],
  'icon-eye': [
    {
      element: 'path',
      attributes: {
        d: 'M1 12S5 5 12 5S23 12 23 12S19 19 12 19S1 12 1 12Z',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 3,
      },
    },
  ],
  'icon-filter': [
    {
      element: 'polygon',
      attributes: {
        points: '22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3',
      },
    },
  ],
  'icon-geodesic': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 2,
        x2: 22,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
      },
    },
  ],
  'icon-globe': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 2,
        x2: 22,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M12 2A15.3 15.3 0 0 1 16 12A15.3 15.3 0 0 1 12 22A15.3 15.3 0 0 1 8 12A15.3 15.3 0 0 1 12 2Z',
      },
    },
  ],
  'icon-heading-five': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '5',
    },
  ],
  'icon-heading-four': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '4',
    },
  ],
  'icon-heading-one': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '1',
    },
  ],
  'icon-heading-six': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '6',
    },
  ],
  'icon-heading-three': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '3',
    },
  ],
  'icon-heading-two': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'text',
      attributes: {
        fill: 'currentColor',
        'font-family': 'sans-serif',
        'font-size': 8,
        stroke: 'none',
        x: 16,
        y: 18,
      },
      textContent: '2',
    },
  ],
  'icon-heading': [
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 4,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 6,
        y2: 18,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 4,
        x2: 12,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 17,
        x2: 20,
        y1: 10,
        y2: 8,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 20,
        x2: 20,
        y1: 8,
        y2: 18,
      },
    },
  ],
  'icon-heart': [
    {
      element: 'path',
      attributes: {
        d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
      },
    },
  ],
  'icon-home': [
    {
      element: 'path',
      attributes: {
        d: 'M3 9L12 2L21 9V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20Z',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,22 9,12 15,12 15,22',
      },
    },
  ],
  'icon-image': [
    {
      element: 'rect',
      attributes: {
        height: 18,
        rx: 2,
        ry: 2,
        width: 18,
        x: 3,
        y: 3,
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 8.5,
        cy: 8.5,
        r: 1.5,
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '21 15 16 10 5 21',
      },
    },
  ],
  'icon-info': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 8,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 16,
        y2: 16,
      },
    },
  ],
  'icon-italic': [
    {
      element: 'line',
      attributes: {
        x1: 19,
        x2: 10,
        y1: 4,
        y2: 4,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 14,
        x2: 5,
        y1: 20,
        y2: 20,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 9,
        y1: 4,
        y2: 20,
      },
    },
  ],
  'icon-join': [
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 10,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 14,
        x2: 21,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 12,
        r: 2,
        stroke: 'none',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,9 12,12 9,15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '15,9 12,12 15,15',
      },
    },
  ],
  'icon-language': [
    {
      element: 'path',
      attributes: {
        d: 'm5 8 6 6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'm4 14 6-6 2-3',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M2 5h12',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M7 2h1',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'm22 22-5-10-5 10',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M14 18h6',
      },
    },
  ],
  'icon-lightning': [
    {
      element: 'polygon',
      attributes: {
        points: '13 2 4 14 11 14 10 22 20 10 13 10 13 2',
      },
    },
  ],
  'icon-link': [
    {
      element: 'path',
      attributes: {
        d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
      },
    },
  ],
  'icon-lock-open': [
    {
      element: 'rect',
      attributes: {
        height: 11,
        rx: 2,
        ry: 2,
        width: 18,
        x: 3,
        y: 11,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M7 8V7A5 5 0 0 1 12 2',
      },
    },
  ],
  'icon-lock': [
    {
      element: 'rect',
      attributes: {
        height: 11,
        rx: 2,
        ry: 2,
        width: 18,
        x: 3,
        y: 11,
      },
    },
    {
      element: 'path',
      attributes: {
        class: 'forge-icon-lock__shackle',
        d: 'M7 11V7A5 5 0 0 1 17 7V11',
      },
    },
  ],
  'icon-mail': [
    {
      element: 'rect',
      attributes: {
        height: 16,
        rx: 2,
        width: 20,
        x: 2,
        y: 4,
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '22,6 12,13 2,6',
      },
    },
  ],
  'icon-map-pin': [
    {
      element: 'path',
      attributes: {
        d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 10,
        r: 3,
      },
    },
  ],
  'icon-menu': [
    {
      element: 'path',
      attributes: {
        d: 'M3 12H21M3 6H21M3 18H21',
      },
    },
  ],
  'icon-minus': [
    {
      element: 'line',
      attributes: {
        x1: 5,
        x2: 19,
        y1: 12,
        y2: 12,
      },
    },
  ],
  'icon-move': [
    {
      element: 'polyline',
      attributes: {
        points: '5,9 12,2 19,9',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '5,15 12,22 19,15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,5 2,12 9,19',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '15,5 22,12 15,19',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 2,
        y2: 22,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 2,
        x2: 22,
        y1: 12,
        y2: 12,
      },
    },
  ],
  'icon-notice': [
    {
      element: 'path',
      attributes: {
        d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M13.73 21a2 2 0 0 1-3.46 0',
      },
    },
  ],
  'icon-numbered-list': [
    {
      element: 'line',
      attributes: {
        x1: 10,
        x2: 21,
        y1: 6,
        y2: 6,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 10,
        x2: 21,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 10,
        x2: 21,
        y1: 18,
        y2: 18,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 6h1v4',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 10h2',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M6 18H4c0-1 2-2 2-3s-1-2-2-2',
      },
    },
  ],
  'icon-palette': [
    {
      element: 'path',
      attributes: {
        d: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 10 10c0 2-2 3-4 3h-2a2 2 0 0 0-2 2 2 2 0 0 1-2 2Z',
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 7.5,
        cy: 10.5,
        r: 1,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 7.5,
        r: 1,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 16.5,
        cy: 10.5,
        r: 1,
      },
    },
  ],
  'icon-pause': [
    {
      element: 'rect',
      attributes: {
        x: 6,
        y: 5,
        width: 4,
        height: 14,
        rx: 1,
      },
    },
    {
      element: 'rect',
      attributes: {
        x: 14,
        y: 5,
        width: 4,
        height: 14,
        rx: 1,
      },
    },
  ],
  'icon-pencil': [
    {
      element: 'path',
      attributes: {
        d: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
      },
    },
  ],
  'icon-phone': [
    {
      element: 'path',
      attributes: {
        d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
      },
    },
  ],
  'icon-play': [
    {
      element: 'path',
      attributes: {
        d: 'M8 5v14l11-7z',
      },
    },
  ],
  'icon-plus': [
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 5,
        y2: 19,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 5,
        x2: 19,
        y1: 12,
        y2: 12,
      },
    },
  ],
  'icon-puzzle': [
    {
      element: 'path',
      attributes: {
        d: 'M10 3h4a1 1 0 0 1 1 1v2a2 2 0 1 0 4 0V6a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2a2 2 0 1 0 0 4h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2a2 2 0 1 0-4 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a2 2 0 1 0 0-4H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v0',
      },
    },
  ],
  'icon-qr-code': [
    {
      element: 'rect',
      attributes: {
        height: 7,
        rx: 1,
        width: 7,
        x: 3,
        y: 3,
      },
    },
    {
      element: 'rect',
      attributes: {
        height: 7,
        rx: 1,
        width: 7,
        x: 14,
        y: 3,
      },
    },
    {
      element: 'rect',
      attributes: {
        height: 7,
        rx: 1,
        width: 7,
        x: 3,
        y: 14,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M14 14h3v3',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M21 14v7h-7',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M17 21h.01',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M21 17h.01',
      },
    },
  ],
  'icon-refresh': [
    {
      element: 'polyline',
      attributes: {
        points: '23,4 23,10 17,10',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '1,20 1,14 7,14',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M3.51 9A9 9 0 0 1 15 3.05M21 12A9 9 0 0 1 9 20.94',
      },
    },
  ],
  'icon-rotate-ccw': [
    {
      element: 'path',
      attributes: {
        d: 'M3 2v6h6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M3 8A9 9 0 1 1 4.64 14.64',
      },
    },
  ],
  'icon-rotate-cw': [
    {
      element: 'path',
      attributes: {
        d: 'M21 2v6h-6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M21 8A9 9 0 1 0 19.36 14.64',
      },
    },
  ],
  'icon-scale-down': [
    {
      element: 'polyline',
      attributes: {
        points: '3,9 3,3 9,3',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '15,21 21,21 21,15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,3 3,3 3,9',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '21,9 21,3 15,3',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 10,
        y1: 21,
        y2: 14,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 21,
        x2: 14,
        y1: 3,
        y2: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 10,
        y1: 3,
        y2: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 21,
        x2: 14,
        y1: 21,
        y2: 14,
      },
    },
  ],
  'icon-scale-up': [
    {
      element: 'polyline',
      attributes: {
        points: '15,3 21,3 21,9',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '9,21 3,21 3,15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '21,15 21,21 15,21',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '3,9 3,3 9,3',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 21,
        y1: 12,
        y2: 3,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 3,
        y1: 12,
        y2: 21,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 21,
        y1: 12,
        y2: 21,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 3,
        y1: 12,
        y2: 3,
      },
    },
  ],
  'icon-search': [
    {
      element: 'circle',
      attributes: {
        cx: 11,
        cy: 11,
        r: 7,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M21 21L16.65 16.65',
      },
    },
  ],
  'icon-send': [
    {
      element: 'line',
      attributes: {
        x1: 22,
        x2: 11,
        y1: 2,
        y2: 13,
      },
    },
    {
      element: 'polygon',
      attributes: {
        points: '22 2 15 22 11 13 2 9 22 2',
      },
    },
  ],
  'icon-settings': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 3,
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M19.4 15A1.65 1.65 0 0 0 19 16.35L19.08 16.6A2 2 0 1 1 16.08 19.6L15.83 19.52A1.65 1.65 0 0 0 14.35 20.06L14.2 20.39A2 2 0 1 1 9.8 20.39L9.65 20.06A1.65 1.65 0 0 0 8.17 19.52L7.92 19.6A2 2 0 1 1 4.92 16.6L5 16.35A1.65 1.65 0 0 0 4.6 15L4.34 14.8A2 2 0 1 1 4.34 9.2L4.6 9A1.65 1.65 0 0 0 5 7.65L4.92 7.4A2 2 0 1 1 7.92 4.4L8.17 4.48A1.65 1.65 0 0 0 9.65 3.94L9.8 3.61A2 2 0 1 1 14.2 3.61L14.35 3.94A1.65 1.65 0 0 0 15.83 4.48L16.08 4.4A2 2 0 1 1 19.08 7.4L19 7.65A1.65 1.65 0 0 0 19.4 9L19.66 9.2A2 2 0 1 1 19.66 14.8Z',
      },
    },
  ],
  'icon-share': [
    {
      element: 'circle',
      attributes: {
        cx: 18,
        cy: 5,
        r: 3,
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 6,
        cy: 12,
        r: 3,
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 18,
        cy: 19,
        r: 3,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 8.59,
        x2: 15.42,
        y1: 13.51,
        y2: 17.49,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15.41,
        x2: 8.59,
        y1: 6.51,
        y2: 10.49,
      },
    },
  ],
  'icon-sort': [
    {
      element: 'path',
      attributes: {
        fill: 'currentColor',
        stroke: 'currentColor',
        d: 'M12 3l5 7H7l5-7z',
        'stroke-width': 1.5,
      },
    },
    {
      element: 'path',
      attributes: {
        fill: 'currentColor',
        stroke: 'currentColor',
        d: 'M12 21l-5-7h10l-5 7z',
        'stroke-width': 1.5,
      },
    },
  ],
  'icon-split': [
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 10,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 14,
        x2: 21,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'circle',
      attributes: {
        fill: 'currentColor',
        cx: 12,
        cy: 12,
        r: 2,
        stroke: 'none',
      },
    },
    {
      element: 'line',
      attributes: {
        'stroke-dasharray': '2,2',
        x1: 12,
        x2: 12,
        y1: 5,
        y2: 9,
      },
    },
    {
      element: 'line',
      attributes: {
        'stroke-dasharray': '2,2',
        x1: 12,
        x2: 12,
        y1: 15,
        y2: 19,
      },
    },
  ],
  'icon-star': [
    {
      element: 'polygon',
      attributes: {
        points: '12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2',
      },
    },
  ],
  'icon-strikethrough': [
    {
      element: 'path',
      attributes: {
        d: 'M16 4H9a3 3 0 0 0-2.83 4',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M14 12a4 4 0 0 1 0 8H8',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 12h16',
      },
    },
  ],
  'icon-table-column-add': [
    {
      element: 'path',
      attributes: {
        d: 'M3 3h10v18H3z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 13,
        y1: 9,
        y2: 9,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 13,
        y1: 15,
        y2: 15,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 18,
        x2: 18,
        y1: 9,
        y2: 21,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 24,
        y1: 15,
        y2: 15,
      },
    },
  ],
  'icon-table-column-remove': [
    {
      element: 'path',
      attributes: {
        d: 'M3 3h10v18H3z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 13,
        y1: 9,
        y2: 9,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 13,
        y1: 15,
        y2: 15,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 16,
        x2: 22,
        y1: 12,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 16,
        x2: 13,
        y1: 9,
        y2: 18,
      },
    },
  ],
  'icon-table-row-add': [
    {
      element: 'path',
      attributes: {
        d: 'M3 3h18v10H3z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 9,
        y1: 3,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 15,
        y1: 3,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 17,
        y2: 23,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 15,
        y1: 20,
        y2: 20,
      },
    },
  ],
  'icon-table-row-remove': [
    {
      element: 'path',
      attributes: {
        d: 'M3 3h18v10H3z',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 9,
        y1: 3,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 15,
        y1: 3,
        y2: 13,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 15,
        y1: 17,
        y2: 23,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 9,
        y1: 17,
        y2: 23,
      },
    },
  ],
  'icon-table': [
    {
      element: 'rect',
      attributes: {
        height: 18,
        rx: 2,
        ry: 2,
        width: 18,
        x: 3,
        y: 3,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 21,
        y1: 9,
        y2: 9,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 3,
        x2: 21,
        y1: 15,
        y2: 15,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 9,
        x2: 9,
        y1: 3,
        y2: 21,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 15,
        x2: 15,
        y1: 3,
        y2: 21,
      },
    },
  ],
  'icon-trash': [
    {
      element: 'polyline',
      attributes: {
        points: '3,6 5,6 21,6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M19 6L18.149 19.148A2 2 0 0 1 16.154 21H7.846A2 2 0 0 1 5.851 19.148L5 6',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M10 11V17',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M14 11V17',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M9 6V4A1 1 0 0 1 10 3H14A1 1 0 0 1 15 4V6',
      },
    },
  ],
  'icon-underline': [
    {
      element: 'path',
      attributes: {
        d: 'M6 4v6a6 6 0 0 0 12 0V4',
      },
    },
    {
      element: 'path',
      attributes: {
        d: 'M4 20h16',
      },
    },
  ],
  'icon-upload': [
    {
      element: 'path',
      attributes: {
        d: 'M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15',
      },
    },
    {
      element: 'polyline',
      attributes: {
        points: '17,8 12,3 7,8',
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 3,
        y2: 15,
      },
    },
  ],
  'icon-user': [
    {
      element: 'path',
      attributes: {
        d: 'M20 21V19A4 4 0 0 0 16 15H8A4 4 0 0 0 4 19V21',
      },
    },
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 7,
        r: 4,
      },
    },
  ],
  'icon-warning': [
    {
      element: 'circle',
      attributes: {
        cx: 12,
        cy: 12,
        r: 10,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12,
        y1: 8,
        y2: 12,
      },
    },
    {
      element: 'line',
      attributes: {
        x1: 12,
        x2: 12.01,
        y1: 16,
        y2: 16,
      },
    },
  ],
  'icon-wrench': [
    {
      element: 'path',
      attributes: {
        d: 'M14.7 6.3a4.5 4.5 0 0 0 5.95 5.95L22 13.59V20a2 2 0 0 1-2 2h-6.41l-1.34-1.34a4.5 4.5 0 0 0-5.95-5.95L4 12.42V6a2 2 0 0 1 2-2h6.41l2.29 2.3Z',
      },
    },
  ],
};
