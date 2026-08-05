/**
 * Discovery helpers shared by the two-stage compiler.
 *
 * The neutral components are authored in a per-component folder
 * (`src/components/<name>/<name>.tsx`, or nested under an atomic-design level
 * such as `src/components/atoms/<name>/<name>.tsx`) and re-exported from a
 * single barrel (`src/components/index.ts`). Both the Stage-1 code generator and
 * the declaration synthesiser need to know, for each component: its neutral
 * export name (`BaseBadge`), the public name it ships under (`Badge`), the
 * folder/file base name (`base-badge`, always flat for generated output), the
 * source directory relative to the barrel (`atoms/base-badge` when nested), and
 * the exported props interface (`BadgeProperties`) — all of which are derived
 * here by parsing the barrel's `export { … } from './…'` re-exports.
 */

/** A neutral component discovered in the barrel, plus its derived public shape. */
export interface DiscoveredComponent {
  /** The neutral export name, e.g. `BaseBadge`. */
  neutralName: string;
  /** The public export name, e.g. `Badge`. */
  publicName: string;
  /** The exported props interface name, e.g. `BadgeProperties` (if present). */
  propertiesType: string | undefined;
  /** Every type re-exported alongside the component, e.g. `['BadgeVariant', 'BadgeProperties']`. */
  typeExports: string[];
  /**
   * The folder / file base name the component is authored in, e.g. `base-badge`.
   * Always the **basename** — used for the flat generated output (`dist/<fw>/base-badge.js`)
   * and entry re-exports (`./base-badge`), regardless of source nesting.
   */
  folder: string;
  /**
   * The re-export specifier relative to the barrel, stripped of a leading `./`
   * and any trailing `/index`, preserving nested folders — e.g. `./base-badge`
   * → `base-badge`, `./atoms/base-badge` → `atoms/base-badge`. The Stage-1
   * generator joins this under `componentsDir` to locate the source `.tsx`.
   */
  sourceDir: string;
}

/** A single `export { … } from '…'` re-export parsed from the barrel. */
interface ReExport {
  /** Value (component) export names. */
  values: string[];
  /** Type export names. */
  types: Set<string>;
  /** The module path the names are re-exported from. */
  from: string;
}

/** Parse every `export { … } from '…'` statement in a barrel module. */
function parseReExports(source: string): ReExport[] {
  const result: ReExport[] = [];
  const reExport = /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = reExport.exec(source);
  while (match !== null) {
    const values: string[] = [];
    const types = new Set<string>();
    for (const raw of match[1].split(',')) {
      const token = raw.trim();
      if (token.length === 0) {
        continue;
      }
      if (token.startsWith('type ')) {
        types.add(token.slice('type '.length).trim());
      } else if (/^[A-Z]/.test(token)) {
        values.push(token);
      }
    }
    result.push({ values, types, from: match[2] });
    match = reExport.exec(source);
  }
  return result;
}

/** The final path segment of a module specifier, e.g. `./base-badge` → `base-badge`. */
function moduleBaseName(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  return segments.at(-1) ?? specifier;
}

/**
 * The re-export specifier relative to the barrel, stripped of a leading `./` and
 * any trailing `/index`, preserving nested folders — e.g. `./composables/use-d3`
 * → `composables/use-d3`, `./use-d3` → `use-d3`.
 */
function moduleRelativePath(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
  if (segments.length > 1 && segments.at(-1) === 'index') {
    segments.pop();
  }
  return segments.join('/') || (segments.at(-1) ?? specifier);
}

/**
 * Collapse a trailing duplicated path segment, so a file-style component
 * re-export folds onto its containing folder — e.g. `organisms/three-canvas/
 * three-canvas` → `organisms/three-canvas` (the barrel points at the file, not
 * the folder's `index`). A folder-style path (`atoms/base-badge`) is unchanged.
 */
function stripTrailingDuplicate(relativePath: string): string {
  const segments = relativePath.split('/');
  if (segments.length >= 2 && segments.at(-1) === segments.at(-2)) {
    segments.pop();
  }
  return segments.join('/');
}

/**
 * A non-component **helper module** re-exported from the barrel (e.g. the
 * `toast-store`), so its public API rides through the generated `./react` /
 * `./vue` entry alongside the components.
 */
export interface DiscoveredHelperExport {
  /** The folder / file base name the helper lives in, e.g. `toast-store`. */
  base: string;
  /**
   * The re-export specifier relative to the barrel, **without** the leading
   * `./`, preserving any nested folders — e.g. `composables/use-observable` or
   * `toast-store`. The Stage-1 generator uses this (not {@link base}) to mirror
   * the source `src/` layout (`composables/`, `utils/`, …) into the generated
   * tree so hook libraries follow the same hierarchy as component packages.
   */
  relativePath: string;
  /** Value export names (functions/consts), e.g. `useToast`, `showToast`. */
  values: string[];
  /** Type export names, e.g. `ToastOptions`, `ToastRecord`. */
  types: string[];
}

/**
 * Discover the **helper modules** a barrel re-exports — every `export { … }
 * from './…'` statement whose module base name is **not** one of the discovered
 * component folders. Used to forward shared framework-agnostic APIs (such as the
 * `toast-store`'s imperative `useToast`/`showToast`/… helpers, the counterpart
 * of the Vue package's `useToast` composable) through the generated entry, so
 * consumers drive the very same per-framework singleton the components use.
 */
export function discoverHelperExports(
  barrelSource: string,
  componentFolders: ReadonlySet<string>,
): DiscoveredHelperExport[] {
  const helpers: DiscoveredHelperExport[] = [];
  for (const reExport of parseReExports(barrelSource)) {
    const base = moduleBaseName(reExport.from);
    if (componentFolders.has(base)) {
      continue;
    }
    // `parseReExports` keeps only PascalCase value names (components); a helper
    // module's value exports are typically lowercase functions/consts, so
    // re-scan the statement to collect every non-type token as a value export.
    const values = collectHelperValues(barrelSource, reExport.from);
    const types = [...reExport.types];
    if (values.length > 0 || types.length > 0) {
      helpers.push({ base, relativePath: moduleRelativePath(reExport.from), values, types });
    }
  }
  return helpers;
}

/** Re-scan a barrel for the value (non-type) names a given module is re-exported under. */
function collectHelperValues(barrelSource: string, from: string): string[] {
  const escaped = from.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const statement = new RegExp(String.raw`export\s*\{([^}]*)\}\s*from\s*['"]${escaped}['"]`);
  const match = statement.exec(barrelSource);
  if (match === null) {
    return [];
  }
  const values: string[] = [];
  for (const raw of match[1].split(',')) {
    const token = raw.trim();
    if (token.length === 0 || token.startsWith('type ')) {
      continue;
    }
    values.push(token);
  }
  return values;
}

/**
 * Discover the components a barrel exports and derive their public shape. Each
 * value export is paired with the props interface re-exported from the same
 * statement (by the `<PublicName>Properties` convention) and the folder it lives
 * in (the re-export's module base name).
 */
export function discoverComponents(barrelSource: string, stripPrefix = 'Base'): DiscoveredComponent[] {
  const components: DiscoveredComponent[] = [];
  for (const reExport of parseReExports(barrelSource)) {
    const folder = moduleBaseName(reExport.from);
    // The component's source **folder** relative to the barrel. A folder-style
    // re-export (`./atoms/base-badge`) yields the folder directly; a file-style
    // re-export (`./organisms/three-canvas/three-canvas`, pointing at the file
    // rather than the folder's `index`) ends with the basename twice, so drop
    // the trailing duplicate — the generator appends `<folder>.tsx` itself.
    const sourceDir = stripTrailingDuplicate(moduleRelativePath(reExport.from));
    for (const neutralName of reExport.values) {
      const publicName = neutralName.startsWith(stripPrefix) ? neutralName.slice(stripPrefix.length) : neutralName;
      const candidate = `${publicName}Properties`;
      components.push({
        neutralName,
        publicName,
        propertiesType: reExport.types.has(candidate) ? candidate : undefined,
        typeExports: [...reExport.types],
        folder,
        sourceDir,
      });
    }
  }
  return components;
}
