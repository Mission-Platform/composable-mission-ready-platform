/** A stable category assignment for every icon source in this package. */
export interface IconCatalogEntry {
  readonly name: string;
  readonly category: string;
  readonly subcategory: string;
  readonly sourcePath?: string;
}

const catalogGroups = {
  'status/feedback': [
    'forge-icon-alert',
    'forge-icon-alert-critical',
    'forge-icon-alert-info',
    'forge-icon-alert-neutral',
    'forge-icon-alert-warning',
    'forge-icon-check',
    'forge-icon-error',
    'forge-icon-info',
    'forge-icon-notice',
    'forge-icon-warning',
  ],
  'text/formatting': [
    'forge-icon-align-center',
    'forge-icon-align-justify',
    'forge-icon-align-left',
    'forge-icon-align-right',
    'forge-icon-blockquote',
    'forge-icon-bold',
    'forge-icon-bullet-list',
    'forge-icon-code-block',
    'forge-icon-code-inline',
    'forge-icon-heading',
    'forge-icon-heading-five',
    'forge-icon-heading-four',
    'forge-icon-heading-one',
    'forge-icon-heading-six',
    'forge-icon-heading-three',
    'forge-icon-heading-two',
    'forge-icon-italic',
    'forge-icon-numbered-list',
    'forge-icon-strikethrough',
    'forge-icon-underline',
  ],
  'navigation/controls': [
    'forge-icon-arrow',
    'forge-icon-chevron',
    'forge-icon-chevrons',
    'forge-icon-close',
    'forge-icon-home',
    'forge-icon-join',
    'forge-icon-menu',
    'forge-icon-minus',
    'forge-icon-plus',
    'forge-icon-refresh',
    'forge-icon-split',
  ],
  'navigation/links': ['forge-icon-external-link', 'forge-icon-link'],
  'navigation/search': ['forge-icon-search'],
  'communication/messaging': [
    'forge-icon-bell',
    'forge-icon-chat',
    'forge-icon-mail',
    'forge-icon-phone',
    'forge-icon-send',
  ],
  'communication/sharing': ['forge-icon-share'],
  'time/calendar': ['forge-icon-calendar', 'forge-icon-clock'],
  'media/capture': ['forge-icon-camera', 'forge-icon-image'],
  'media/playback': ['forge-icon-pause', 'forge-icon-play'],
  'maps/geography': [
    'forge-icon-country-globe',
    'forge-icon-flag',
    'forge-icon-geodesic',
    'forge-icon-globe',
    'forge-icon-language',
    'forge-icon-map-pin',
  ],
  'maps/layers': ['forge-icon-layer'],
  'maps/markers': ['forge-icon-map-marker-cluster'],
  'routing/directions': ['forge-icon-route', 'forge-icon-waypoint'],
  'drawing/transform': [
    'forge-icon-draw-circle',
    'forge-icon-draw-line',
    'forge-icon-draw-polygon',
    'forge-icon-draw-square',
    'forge-icon-draw-triangle',
    'forge-icon-move',
    'forge-icon-palette',
    'forge-icon-pencil',
    'forge-icon-rotate-ccw',
    'forge-icon-rotate-cw',
    'forge-icon-scale-down',
    'forge-icon-scale-up',
  ],
  'content/editing': [
    'forge-icon-copy',
    'forge-icon-edit',
    'forge-icon-eye',
    'forge-icon-eye-off',
    'forge-icon-redo',
    'forge-icon-trash',
    'forge-icon-undo',
  ],
  'content/files': ['forge-icon-download', 'forge-icon-upload'],
  'data/filtering': ['forge-icon-filter'],
  'data/tables': [
    'forge-icon-sort',
    'forge-icon-table',
    'forge-icon-table-column-add',
    'forge-icon-table-column-remove',
    'forge-icon-table-row-add',
    'forge-icon-table-row-remove',
  ],
  'security/access': ['forge-icon-lock', 'forge-icon-lock-open', 'forge-icon-user'],
  'objects/system': [
    'forge-icon-cloud',
    'forge-icon-debug',
    'forge-icon-heart',
    'forge-icon-lightning',
    'forge-icon-puzzle',
    'forge-icon-qr-code',
    'forge-icon-settings',
    'forge-icon-star',
    'forge-icon-wrench',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** The reviewed catalog for the existing icon set. */
export const ICON_CATALOG: readonly IconCatalogEntry[] = Object.entries(catalogGroups).flatMap(([group, names]) => {
  const [category, subcategory] = group.split('/');
  return names.map((name) => ({ name, category, subcategory }));
});

/** High-value additions to implement after the source taxonomy is established. */
export const ICON_GAP_REVIEW = {
  implemented: [
    'forge-icon-flag',
    'forge-icon-country-globe',
    'forge-icon-route',
    'forge-icon-waypoint',
    'forge-icon-layer',
    'forge-icon-map-marker-cluster',
    'forge-icon-undo',
    'forge-icon-redo',
  ],
  planned: [],
  deferred: [
    'Dedicated artwork for every ISO country code',
    'Application-specific operational symbols',
    'Large domain-specific transportation and infrastructure sets',
  ],
} as const;

/** Validate the static catalog before it is used to generate package metadata. */
export function validateIconCatalog(catalog: readonly IconCatalogEntry[] = ICON_CATALOG): void {
  const names = new Set<string>();
  const generatedBasenames = new Set<string>();

  for (const entry of catalog) {
    if (!entry.name.startsWith('forge-icon-')) {
      throw new Error(`[icons] Invalid icon name: ${entry.name}`);
    }
    if (!entry.category || !entry.subcategory) {
      throw new Error(`[icons] Missing category assignment for ${entry.name}`);
    }
    if (names.has(entry.name)) {
      throw new Error(`[icons] Duplicate icon catalog entry: ${entry.name}`);
    }
    names.add(entry.name);

    const basename = entry.sourcePath?.split('/').at(-1) ?? entry.name;
    if (generatedBasenames.has(basename)) {
      throw new Error(`[icons] Generated component basename collision: ${basename}`);
    }
    generatedBasenames.add(basename);
  }
}

validateIconCatalog();
