import type {
  CompilerDiagnostic,
  GeneratedExtraModule,
  OutputLanguage,
  SourceSpan,
  TsdownBuildContext,
  ViteBuildContext,
} from "@mission-platform/forge-plugin-api";
import type { TsdownPlugin } from "tsdown";
import type { Plugin as VitePlugin } from "vite";

/** The package whose imports are understood by the router compiler pass. */
export const MP_ROUTER_MODULE = "@mission-platform/router" as const;

/** Stable marker shared with the neutral router package. */
export const MP_ROUTER_COMPILER_MARKER =
  "mission-platform:router-capability" as const;

/** Independently lowerable operations exposed by the neutral router contract. */
export type RouterCapability =
  "link" | "route" | "navigate" | "resolve" | "view";

/** How a neutral router binding is used in a source module. */
export type RouterCapabilityUseKind = "call" | "jsx" | "reference";

/** A neutral import that may be rewritten by a selected router target. */
export interface RouterCapabilityImport {
  readonly importedName: string;
  readonly localName: string;
  readonly typeOnly: boolean;
  readonly span: SourceSpan;
}

/** One use of a neutral router marker, retaining source coordinates for diagnostics. */
export interface RouterCapabilityUse {
  readonly capability: RouterCapability;
  readonly importedName: string;
  readonly localName: string;
  readonly kind: RouterCapabilityUseKind;
  readonly span: SourceSpan;
}

/** Neutral IR passed to router target plugins. It describes consumption only. */
export interface RouterCapabilityModule {
  readonly kind: "router-capability-module";
  readonly source: string;
  readonly fileName: string;
  readonly moduleKind: "component" | "composable";
  readonly imports: readonly RouterCapabilityImport[];
  readonly uses: readonly RouterCapabilityUse[];
}

/** The app/framework context selected independently from the router target. */
export interface RouterTargetContext {
  readonly routerTarget: string;
  readonly uiFramework: string;
  readonly moduleKind: "component" | "composable";
  readonly fileName: string;
  readonly sourceRoot?: string;
  readonly conditions?: readonly string[];
}

/** Target-specific plan produced between lowering and generation. */
export interface RouterTargetPlan {
  readonly routerTarget: string;
  readonly module: RouterCapabilityModule;
  readonly diagnostics?: readonly CompilerDiagnostic[];
}

/** Neutral options shared by router optimizers. */
export interface RouterOptimizeOptions {
  readonly preserveSourceMap?: boolean;
  readonly custom?: Readonly<Record<string, unknown>>;
}

/** A declaration emitted beside a generated router module. */
export interface GeneratedRouterDeclaration {
  readonly name: string;
  readonly code: string;
}

/** A generated source module returned by a router target. */
export interface GeneratedRouterModule {
  readonly code: string;
  readonly lang: OutputLanguage;
  readonly extraModules?: readonly GeneratedExtraModule[];
  readonly declarations?: readonly GeneratedRouterDeclaration[];
  readonly map?: string | Readonly<Record<string, unknown>>;
  readonly diagnostics?: readonly CompilerDiagnostic[];
}

/** Build hooks owned by a router target; no router dependency is loaded by core. */
export interface RouterBuildAdapters {
  readonly vite?: (context: ViteBuildContext) => readonly VitePlugin[];
  readonly tsdown?: (context: TsdownBuildContext) => readonly TsdownPlugin[];
}

/** Forge-style compiler plugin for a native router target. */
export interface RouterOutputPlugin {
  readonly id: string;
  readonly routerPackage: string;
  readonly capabilities: readonly RouterCapability[];
  readonly lower: (
    ir: RouterCapabilityModule,
    context: RouterTargetContext,
  ) => RouterTargetPlan;
  readonly optimize: (
    plan: RouterTargetPlan,
    options: RouterOptimizeOptions,
  ) => RouterTargetPlan;
  readonly generate: (plan: RouterTargetPlan) => GeneratedRouterModule;
  readonly build: RouterBuildAdapters;
}

/** A native import used to replace one neutral router marker. */
export interface RouterNativeImport {
  readonly module: string;
  readonly name: string;
}

/**
 * Neutral runtime exports that preserve the package-author contract.
 *
 * Targets that cannot rename native hooks 1:1 (for example React's
 * `useNavigate` vs neutral `useMpRouter().navigate`) must expose these names
 * from a target runtime module and point {@link ForgeRouterTargetOptions.runtimeModule}
 * at that module.
 */
export const FORGE_ROUTER_RUNTIME_EXPORTS = [
  "MpLink",
  "MpRouterView",
  "useMpRoute",
  "useMpRouter",
  "useMpNavigation",
  "resolveMpLink",
] as const;

/** Configuration for the standard source-rewriting router target factory. */
export interface ForgeRouterTargetOptions {
  readonly id: string;
  readonly routerPackage: string;
  readonly capabilities: readonly RouterCapability[];
  /**
   * Module that exports the neutral-shaped runtime helpers listed in
   * {@link FORGE_ROUTER_RUNTIME_EXPORTS}. Preferred over bare native renames
   * whenever hook/component shapes differ from the neutral contract.
   */
  readonly runtimeModule?: string;
  /** Optional per-symbol overrides merged on top of {@link runtimeModule} defaults. */
  readonly imports?: Readonly<Record<string, RouterNativeImport>>;
  readonly build?: RouterBuildAdapters;
}

function resolveTargetImports(
  options: ForgeRouterTargetOptions,
): Readonly<Record<string, RouterNativeImport>> {
  const imports: Record<string, RouterNativeImport> = {};
  if (options.runtimeModule) {
    for (const name of FORGE_ROUTER_RUNTIME_EXPORTS) {
      imports[name] = { module: options.runtimeModule, name };
    }
  }
  return { ...imports, ...options.imports };
}

function nativeImportCode(
  imports: readonly {
    readonly localName: string;
    readonly native: RouterNativeImport;
  }[],
): string {
  const byModule = new Map<
    string,
    { localName: string; nativeName: string }[]
  >();
  for (const entry of imports) {
    const moduleImports = byModule.get(entry.native.module) ?? [];
    moduleImports.push({
      localName: entry.localName,
      nativeName: entry.native.name,
    });
    byModule.set(entry.native.module, moduleImports);
  }
  return [...byModule.entries()]
    .map(([module, entries]) => {
      const specifiers = entries.map(({ localName, nativeName }) =>
        localName === nativeName ? nativeName : `${nativeName} as ${localName}`,
      );
      return `import { ${specifiers.join(", ")} } from '${module}';`;
    })
    .join("\n");
}

/**
 * Create a deterministic target that rewrites neutral router imports.
 *
 * Prefer {@link ForgeRouterTargetOptions.runtimeModule}: it keeps call sites
 * (`useMpRouter().navigate`, `useMpRoute().query`, …) shape-compatible by
 * importing target runtime helpers rather than bare native hooks with different
 * signatures. Targets may still supply custom lower/generate phases for
 * file-based or server-only routers.
 */
export function defineForgeRouterTarget(
  options: ForgeRouterTargetOptions,
): RouterOutputPlugin {
  const imports = resolveTargetImports(options);
  return defineForgeRouterPlugin({
    id: options.id,
    routerPackage: options.routerPackage,
    capabilities: options.capabilities,
    lower: (module, context) => ({
      routerTarget: context.routerTarget,
      module,
    }),
    optimize: (plan) => plan,
    generate: (plan) => {
      const native = plan.module.imports.flatMap((entry) => {
        const mapping = imports[entry.importedName];
        return mapping === undefined || entry.typeOnly
          ? []
          : [{ localName: entry.localName, native: mapping }];
      });
      const importText = nativeImportCode(native);
      const neutralImport =
        /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@mission-platform\/router['"];?/gu;
      let insertedNativeImports = false;
      const code = plan.module.source.replaceAll(neutralImport, () => {
        if (importText.length === 0) {
          return "";
        }
        if (insertedNativeImports) {
          return "";
        }
        insertedNativeImports = true;
        return importText;
      });
      return { code, lang: plan.module.fileName.split(".").pop() ?? "ts" };
    },
    build: options.build ?? {},
  });
}

/** A contract advertised by a future router target without shipping its adapter. */
export interface RouterTargetExtensionContract {
  readonly id: string;
  readonly routerPackage: string;
  readonly capabilities: readonly RouterCapability[];
  readonly status: "extension";
  readonly notes: string;
}

/** Reserved target contracts for routers whose first-party adapters are not part of this milestone. */
export const forgeRouterExtensionContracts: readonly RouterTargetExtensionContract[] =
  [
    {
      id: "tanstack",
      routerPackage: "@tanstack/router",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      status: "extension",
      notes:
        "Provide route-tree and loader conditions from the consuming application.",
    },
    {
      id: "nuxt",
      routerPackage: "#app",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      status: "extension",
      notes:
        "The Nuxt module must bind file-based routes and server payload semantics.",
    },
    {
      id: "next",
      routerPackage: "next/navigation",
      capabilities: ["link", "route", "navigate", "resolve", "view"],
      status: "extension",
      notes:
        "The Next adapter must distinguish client navigation from server and app-router modules.",
    },
  ];

/** A router plugin can be supplied directly or selected by its stable id. */
export type RouterPluginSelection = RouterOutputPlugin | string;

/** Create a source-local diagnostic for a router compiler failure. */
export function createRouterDiagnostic(
  diagnostic: Omit<CompilerDiagnostic, "phase" | "fileName"> & {
    readonly fileName?: string;
  },
): CompilerDiagnostic {
  return {
    ...diagnostic,
    phase: "generation",
    fileName: diagnostic.fileName ?? "<unknown>",
  };
}

/** Validate router plugin metadata before it enters a compiler pipeline. */
export function defineForgeRouterPlugin<T extends RouterOutputPlugin>(
  plugin: T,
): T {
  if (typeof plugin !== "object" || plugin === null) {
    throw new TypeError("A Forge router plugin must be an object.");
  }
  if (typeof plugin.id !== "string" || plugin.id.length === 0) {
    throw new TypeError("A Forge router plugin must define a non-empty id.");
  }
  if (
    typeof plugin.routerPackage !== "string" ||
    plugin.routerPackage.length === 0
  ) {
    throw new TypeError(
      `Forge router plugin "${plugin.id}" must define routerPackage.`,
    );
  }
  if (!Array.isArray(plugin.capabilities)) {
    throw new TypeError(
      `Forge router plugin "${plugin.id}" must define capabilities.`,
    );
  }
  for (const method of ["lower", "optimize", "generate"] as const) {
    if (typeof plugin[method] !== "function") {
      throw new TypeError(
        `Forge router plugin "${plugin.id}" must define ${method}().`,
      );
    }
  }
  if (typeof plugin.build !== "object" || plugin.build === null) {
    throw new TypeError(
      `Forge router plugin "${plugin.id}" must define build adapters.`,
    );
  }
  return plugin;
}

/** Find a direct or id-selected router target without coupling it to UI plugins. */
export function selectForgeRouterPlugin(
  selection: RouterPluginSelection | undefined,
  plugins: readonly RouterOutputPlugin[] = [],
): RouterOutputPlugin | undefined {
  if (selection === undefined) return undefined;
  if (typeof selection !== "string") return selection;
  return plugins.find((plugin) => plugin.id === selection);
}

/** Report capability gaps before a target has a chance to silently miscompile a module. */
export function unsupportedRouterCapabilities(
  ir: RouterCapabilityModule,
  plugin: RouterOutputPlugin | undefined,
): readonly CompilerDiagnostic[] {
  if (plugin === undefined) {
    return ir.uses.map((use) =>
      createRouterDiagnostic({
        severity: "error",
        code: "MP_ROUTER_TARGET_REQUIRED",
        message: `Router capability "${use.capability}" requires a selected native router target.`,
        fileName: ir.fileName,
        span: use.span,
      }),
    );
  }
  const supported = new Set(plugin.capabilities);
  return [...new Set(ir.uses.map((use) => use.capability))]
    .filter((capability) => !supported.has(capability))
    .map((capability) =>
      createRouterDiagnostic({
        severity: "error",
        code: "MP_ROUTER_CAPABILITY_UNSUPPORTED",
        message: `Router target "${plugin.id}" does not support the "${capability}" capability.`,
        fileName: ir.fileName,
        span: ir.uses.find((use) => use.capability === capability)?.span,
      }),
    );
}
