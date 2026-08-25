import type {
  DiscoveredComponent,
  DiscoveredExternalExport,
  DiscoveredHelperBinding,
  DiscoveredHelperExport,
} from '../compiler/discover.js';
import type { FrameworkSourceTarget } from '../generate.js';
import type { JsxFramework } from '@mission-platform/forge-plugin-api';

export interface TypeOrigin {
  /** The flat-tree module base that exports the type (a component folder or a copied helper). */
  base: string;
  /** `true` when the base is a compiled component (Vue → `./<base>.vue`); `false` for a plain helper (`./<base>`). */
  isComponent: boolean;
}

/** Resolve which flat-tree module a component's companion type is declared in, or `undefined` if unresolved. */
export type TypeOriginResolver = (folder: string, typeName: string) => TypeOrigin | undefined;

/**
 * Default {@link TypeOriginResolver}: assume every companion type is declared in
 * its own component's module. The full driver ({@link generateFrameworkSources})
 * supplies an origin-accurate resolver instead; this keeps {@link generateEntry}
 * usable in isolation (e.g. unit tests) where the common case holds.
 */
const defaultTypeOriginResolver: TypeOriginResolver = (folder) => ({ base: folder, isComponent: true });

/**
 * Re-export one helper module's value + type bindings from the mirrored tree.
 *
 * `claimed` carries every name the entry already exports — a helper type is
 * routinely re-exported alongside a component too (`DateRange` ships with both
 * `date-time` and `forge-date-range-input`), and naming it twice in the entry is
 * a duplicate identifier. Returns `undefined` when nothing is left to forward.
 */
function helperReExportLine(helper: DiscoveredHelperExport, claimed: Set<string>): string | undefined {
  const names: string[] = [];
  for (const value of helper.values) {
    if (!claimed.has(value.exportedName)) {
      claimed.add(value.exportedName);
      names.push(helperBindingReExportName(value));
    }
  }
  for (const type of helper.types) {
    if (!claimed.has(type.exportedName)) {
      claimed.add(type.exportedName);
      names.push(helperBindingReExportName(type, true));
    }
  }
  if (names.length === 0) {
    return undefined;
  }
  const relativePath = helper.relativePath
    .replace(/^\.\//, '')
    .replace(/^\.\.\//, '')
    .replace(/^components\//, '');
  return `export { ${names.join(', ')} } from './${relativePath}';`;
}

/** Format a helper binding for a runtime or type-only export list. */
export function helperBindingReExportName(binding: DiscoveredHelperBinding, typeOnly = false): string {
  const alias = binding.localName === binding.exportedName ? '' : ` as ${binding.exportedName}`;
  return `${typeOnly ? 'type ' : ''}${binding.localName}${alias}`;
}

/**
 * Re-export one compiled component under a given export name.
 *
 * React re-exports the neutral function binding (`ForgeBadge`) under the target
 * name; Vue re-exports the SFC's `default` export.
 */
function componentReExportLine(target: FrameworkSourceTarget, component: DiscoveredComponent, as: string): string {
  const fileName = `${component.folder}${target.componentImportExtension}`;
  return target.componentReExport(component, as, `./${fileName}`);
}

/** Adapt the legacy string form accepted by {@link generateEntry}. */
function legacyEntryTarget(framework: JsxFramework): FrameworkSourceTarget {
  const isVue = framework === 'vue';
  return {
    id: framework,
    plugin: undefined as never,
    componentExtension: isVue ? '.vue' : '.tsx',
    componentImportExtension: isVue ? '.vue' : '',
    composableExtension: '.ts',
    entryExtension: isVue ? '.ts' : '.tsx',
    componentReExport: (component, as, specifier) =>
      isVue
        ? `export { default as ${as} } from '${specifier}';`
        : `export { ${component.neutralName} as ${as} } from '${specifier}';`,
    typeModuleSpecifier: (origin) => `${origin.isComponent && isVue ? `./${origin.base}.vue` : `./${origin.base}`}`,
  };
}

/**
 * Re-export a group of public **types** from the flat-tree module that declares
 * them, so they ride through the package entry — and therefore through the `tsc`
 * / `vue-tsc`-emitted `index.d.ts` — exactly as the neutral barrel exports them.
 * A component's own module carries them as declared (React `.tsx`) or `export`ed
 * `<script setup>` declarations (Vue `.vue`); a helper module (`isComponent:
 * false`) is a plain `.ts` re-exported without the `.vue` suffix.
 */
function componentTypesReExportLine(
  target: FrameworkSourceTarget,
  origin: TypeOrigin,
  types: readonly string[],
): string {
  const specifier = target.typeModuleSpecifier(origin);
  const names = types.map((type) => `type ${type}`).join(', ');
  return `export { ${names} } from '${specifier}';`;
}

/**
 * Generate the public entry module re-exporting each compiled component under
 * both its public name (`Badge`) **and** its neutral `Base`-prefixed name
 * (`ForgeBadge`), so the package can be consumed under either convention. Every
 * public **type** a component ships alongside it (variants, option shapes, props
 * interfaces, …) is re-exported too — from the flat-tree module that actually
 * declares it (via {@link TypeOriginResolver}) — so the entry, and the
 * declaration emitted from it, carries the full public surface the neutral
 * barrel exposes, not just the component bindings.
 */
export function generateEntry(
  frameworkOrTarget: JsxFramework | FrameworkSourceTarget,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
  resolveTypeOrigin: TypeOriginResolver = defaultTypeOriginResolver,
  externalExports: readonly DiscoveredExternalExport[] = [],
): string {
  const target = typeof frameworkOrTarget === 'string' ? legacyEntryTarget(frameworkOrTarget) : frameworkOrTarget;

  const claimedComponentNames = new Set<string>();
  const componentLines = components.flatMap((component) => {
    if (claimedComponentNames.has(component.publicName)) {
      return [];
    }
    claimedComponentNames.add(component.publicName);
    const lines = [componentReExportLine(target, component, component.publicName)];
    // Also ship the neutral `Base*` name as an alias of the same component.
    if (component.neutralName !== component.publicName && !claimedComponentNames.has(component.neutralName)) {
      claimedComponentNames.add(component.neutralName);
      lines.push(componentReExportLine(target, component, component.neutralName));
    }
    return lines;
  });

  // Group each component's companion types by the flat-tree module that truly
  // declares them (their own module, or a copied helper such as `date-time`), so
  // no re-export dangles and types shared by that module collapse to one line.
  // Insertion order is preserved; a type that resolves nowhere is skipped rather
  // than emitted as a broken re-export.
  //
  // A type shared by several components (`SpacingScale`, `DateRange`) resolves
  // once per component that re-exports it, so the first module to claim a name
  // wins: re-exporting the same name twice from one module is a duplicate
  // identifier, and every claimant re-exports the same declaration anyway.
  const typesByModule = new Map<string, { origin: TypeOrigin; types: string[] }>();
  const claimedTypes = new Set<string>(claimedComponentNames);
  for (const component of components) {
    for (const type of component.typeExports) {
      if (claimedTypes.has(type)) {
        continue;
      }
      const origin = resolveTypeOrigin(component.folder, type);
      if (origin === undefined) {
        continue;
      }
      claimedTypes.add(type);
      const group = typesByModule.get(origin.base) ?? { origin, types: [] };
      group.types.push(type);
      typesByModule.set(origin.base, group);
    }
  }

  const typeLines = [...typesByModule.values()].map((group) =>
    componentTypesReExportLine(target, group.origin, group.types),
  );

  // Forward shared helper-module APIs (e.g. the toast store) so consumers drive
  // the same per-framework singleton the components use. Helper bindings are
  // filtered against the names the component/type lines already claimed, and
  // against each other, so the same helper reached from two barrels forwards a
  // binding exactly once.
  const claimed = claimedTypes;
  const helperLines = helpers.flatMap((helper) => helperReExportLine(helper, claimed) ?? []);
  const externalLines = externalExports.flatMap((external) => {
    // A named external binding cannot replace a component or helper already
    // selected above. Star exports remain useful because explicit bindings
    // take precedence over names they might contain.
    if (external.exportedName !== undefined && external.star && claimed.has(external.exportedName)) {
      return [];
    }
    if (external.exportedName !== undefined && !external.star) {
      if (claimed.has(external.exportedName)) {
        return [];
      }
      claimed.add(external.exportedName);
    }
    const line = externalReExportLine(external);
    return line.length > 0 ? [line] : [];
  });
  const lines = [...new Set([...componentLines, ...typeLines, ...helperLines, ...externalLines])];
  return `${lines.join('\n')}\n`;
}

/** Preserve a public re-export from another package in each generated framework entry. */
export function externalReExportLine(exported: DiscoveredExternalExport): string {
  if (exported.star) {
    return exported.exportedName === undefined
      ? `export * from '${exported.specifier}';`
      : `export * as ${exported.exportedName} from '${exported.specifier}';`;
  }
  if (exported.exportedName === undefined) {
    return '';
  }
  const importedName = exported.localName ?? exported.exportedName;
  const alias = importedName === exported.exportedName ? '' : ` as ${exported.exportedName}`;
  return `export { ${exported.typeOnly ? 'type ' : ''}${importedName}${alias} } from '${exported.specifier}';`;
}
