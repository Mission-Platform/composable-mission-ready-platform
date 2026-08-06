import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Plugin } from "vite";

export interface I18nPluginOptions {
  /**
   * The source-of-truth locale. It is always included in the supported-locale
   * list and placed first. Defaults to `"en"`.
   */
  defaultLocale?: string;
  /**
   * Directory holding the locale files, relative to the Vite root. Both layouts
   * are supported and auto-detected:
   *
   * - **flat**: `<localesDir>/<code>.yaml`, where each file is itself namespaced
   *   (its top-level keys are i18next namespaces);
   * - **nested**: `<localesDir>/<code>/<namespace>.yaml`, one file per namespace
   *   with the messages at the file root (namespace = the file's base name).
   *
   * Defaults to `"src/locales"`.
   */
  localesDir?: string;
  /**
   * Where to write the generated `virtual:i18n-locales` TypeScript type shim,
   * relative to the Vite root. Defaults to `"src/locales/i18n-locales.d.ts"`.
   */
  typeShimPath?: string;
}

const DEFAULT_LOCALE = "en";

const VIRTUAL_MODULE_ID = "virtual:i18n-resources";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
const VIRTUAL_LOCALES_ID = "virtual:i18n-locales";
const RESOLVED_VIRTUAL_LOCALES_ID = "\0" + VIRTUAL_LOCALES_ID;
const VIRTUAL_LOCALE_PREFIX = "virtual:i18n-locale-";
const RESOLVED_VIRTUAL_LOCALE_PREFIX = "\0" + VIRTUAL_LOCALE_PREFIX;

// Vite replaces the leading null byte (`\0`) that marks a resolved virtual
// module with the URL-safe placeholder `__x00__` when it turns the id into a
// URL. Environments that run in an isolated module runner (such as the
// Cloudflare Worker environment used by the RedwoodSDK app) can hand that
// encoded form back to the `load` hook without decoding it first, so the hook
// must recognise both variants.
const ENCODED_NULL_BYTE = "__x00__";

function stripResolvedPrefix(id: string): string {
  if (id.startsWith("\0")) {
    return id.slice(1);
  }
  if (id.startsWith(ENCODED_NULL_BYTE)) {
    return id.slice(ENCODED_NULL_BYTE.length);
  }
  return id;
}

/** Whether `name` looks like a YAML file we should read. */
function isYamlFile(name: string): boolean {
  return name.endsWith(".yaml") || name.endsWith(".yml");
}

/** Resolve the configured (or default `src/locales`) locales directory. */
function resolveLocalesDirectory(
  root: string,
  options: I18nPluginOptions,
): string {
  return options.localesDir
    ? path.resolve(root, options.localesDir)
    : path.resolve(root, "src/locales");
}

/**
 * Discover every locale code available under `localesDirectory`, across both
 * the flat (`<code>.yaml`) and nested (`<code>/…`) layouts, and always
 * including `defaultLocale`. Returns the codes with `defaultLocale` first and
 * the remaining codes sorted alphabetically, so the list is deterministic.
 */
function discoverLocales(
  localesDirectory: string,
  defaultLocale: string,
): string[] {
  const codes = new Set<string>();
  if (fs.existsSync(localesDirectory)) {
    for (const entry of fs.readdirSync(localesDirectory, {
      withFileTypes: true,
    })) {
      if (entry.isDirectory()) {
        // Nested layout: a subdirectory named after the locale, holding one
        // YAML file per namespace.
        const localeDirectory = path.join(localesDirectory, entry.name);
        try {
          if (
            fs.readdirSync(localeDirectory).some((file) => isYamlFile(file))
          ) {
            codes.add(entry.name);
          }
        } catch {
          // Ignore unreadable entries.
        }
      } else if (entry.isFile() && isYamlFile(entry.name)) {
        // Flat layout: `<code>.yaml`.
        codes.add(path.basename(entry.name, path.extname(entry.name)));
      }
    }
  }
  codes.delete(defaultLocale);
  return [defaultLocale, ...[...codes].toSorted()];
}

/**
 * Read a single locale's resources as an i18next `{ [namespace]: messages }`
 * map, handling both layouts:
 *
 * - **nested**: every `<localesDirectory>/<locale>/<namespace>.yaml` becomes a
 *   namespace entry (namespace = the file's base name);
 * - **flat**: `<localesDirectory>/<locale>.yaml` is itself the namespaced
 *   object and is returned as-is.
 */
function readLocaleResources(
  localesDirectory: string,
  locale: string,
): Record<string, unknown> {
  const nestedDirectory = path.join(localesDirectory, locale);
  if (
    fs.existsSync(nestedDirectory) &&
    fs.statSync(nestedDirectory).isDirectory()
  ) {
    const resources: Record<string, unknown> = {};
    for (const file of fs.readdirSync(nestedDirectory)) {
      if (!isYamlFile(file)) {
        continue;
      }
      const namespace = path.basename(file, path.extname(file));
      try {
        const parsed = yaml.load(
          fs.readFileSync(path.join(nestedDirectory, file), "utf8"),
        );
        if (parsed && typeof parsed === "object") {
          resources[namespace] = parsed;
        }
      } catch {
        // Ignore parse errors
      }
    }
    return resources;
  }

  for (const extension of [".yaml", ".yml"]) {
    const flatPath = path.join(localesDirectory, `${locale}${extension}`);
    if (fs.existsSync(flatPath)) {
      try {
        const parsed = yaml.load(fs.readFileSync(flatPath, "utf8"));
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Ignore parse errors
      }
      break;
    }
  }
  return {};
}

/**
 * Build the `virtual:i18n-locales` ambient type shim, typed to exactly the
 * discovered locales so consumers get a precise `SupportedLocale` union and a
 * `readonly` tuple of `supportedLocales`.
 */
function buildLocalesTypeShim(
  locales: readonly string[],
  defaultLocale: string,
): string {
  // Emit single-quoted string literals so the generated `.d.ts` already matches
  // the consuming apps' Prettier style (single quotes) — otherwise the shim the
  // plugin rewrites on every dev/build would churn and fail `prettier --check`.
  const tuple = locales.map((code) => `'${code}'`).join(", ");
  return [
    "// AUTO-GENERATED by @mission-platform/vite-plugin-i18n. Do not edit by hand.",
    "declare module 'virtual:i18n-locales' {",
    `  export const supportedLocales: readonly [${tuple}];`,
    "  export type SupportedLocale = (typeof supportedLocales)[number];",
    `  export const defaultLocale: '${defaultLocale}';`,
    `  const _default: readonly [${tuple}];`,
    "  export default _default;",
    "}",
    "",
  ].join("\n");
}

/** Options for the build-time {@link readSupportedLocales} helper. */
export interface ReadSupportedLocalesOptions {
  /** Base directory the `localesDir` is resolved against. Defaults to `process.cwd()`. */
  root?: string;
  /** Locales directory relative to `root`. Defaults to `"src/locales"`. */
  localesDir?: string;
  /** Source-of-truth locale, always included and placed first. Defaults to `"en"`. */
  defaultLocale?: string;
}

/**
 * Discover the supported locales at **build/config time**, using the exact same
 * logic as the `virtual:i18n-locales` module. Vite config files cannot import a
 * virtual module (it only exists inside the app bundle), so this lets a config
 * derive its locale list (e.g. for SSG routes / sitemaps) from the same source
 * of truth instead of hand-maintaining a parallel list.
 */
export function readSupportedLocales(
  options: ReadSupportedLocalesOptions = {},
): string[] {
  const root = options.root ?? process.cwd();
  const localesDirectory = options.localesDir
    ? path.resolve(root, options.localesDir)
    : path.resolve(root, "src/locales");
  return discoverLocales(
    localesDirectory,
    options.defaultLocale ?? DEFAULT_LOCALE,
  );
}

export function i18nPlugin(options: I18nPluginOptions = {}): Plugin {
  let root = process.cwd();
  const defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;

  return {
    name: "@mission-platform/vite-plugin-i18n",
    configResolved(config) {
      root = config.root;
      // Emit the `virtual:i18n-locales` type shim so importing the module is
      // typed with the exact selected locales. Written idempotently (only when
      // the content changes) to avoid dev-server reload churn, and never fatal.
      try {
        const locales = discoverLocales(
          resolveLocalesDirectory(root, options),
          defaultLocale,
        );
        const shimPath = options.typeShimPath
          ? path.resolve(root, options.typeShimPath)
          : path.resolve(root, "src/locales/i18n-locales.d.ts");
        const shim = buildLocalesTypeShim(locales, defaultLocale);
        const existing = fs.existsSync(shimPath)
          ? fs.readFileSync(shimPath, "utf8")
          : undefined;
        if (existing !== shim) {
          fs.mkdirSync(path.dirname(shimPath), { recursive: true });
          fs.writeFileSync(shimPath, shim);
        }
      } catch {
        // Never fail the build over the (best-effort) type shim.
      }
    },
    resolveId(id) {
      const bare = stripResolvedPrefix(id);
      if (bare === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      if (bare === VIRTUAL_LOCALES_ID) {
        return RESOLVED_VIRTUAL_LOCALES_ID;
      }
      if (bare.startsWith(VIRTUAL_LOCALE_PREFIX)) {
        return (
          RESOLVED_VIRTUAL_LOCALE_PREFIX +
          bare.slice(VIRTUAL_LOCALE_PREFIX.length)
        );
      }
      return;
    },
    load(id) {
      const bare = stripResolvedPrefix(id);

      // The auto-derived supported-locale list (single source of truth shared
      // by every app), plus the default locale.
      if (bare === VIRTUAL_LOCALES_ID) {
        const locales = discoverLocales(
          resolveLocalesDirectory(root, options),
          defaultLocale,
        );
        return `export const supportedLocales = ${JSON.stringify(locales)};\nexport const defaultLocale = ${JSON.stringify(defaultLocale)};\nexport default supportedLocales;\n`;
      }

      // Every locale's resources, keyed by locale then namespace — used to seed
      // the i18next instance at creation time.
      if (bare === VIRTUAL_MODULE_ID) {
        const localesDirectory = resolveLocalesDirectory(root, options);
        const resources: Record<string, unknown> = {};
        for (const locale of discoverLocales(localesDirectory, defaultLocale)) {
          const localeResources = readLocaleResources(localesDirectory, locale);
          if (Object.keys(localeResources).length > 0) {
            resources[locale] = localeResources;
          }
        }
        return `export const resources = ${JSON.stringify(resources)};\nexport const defaultLocale = ${JSON.stringify(defaultLocale)};\nexport default resources;\n`;
      }

      // A single locale's resources, loaded lazily per route/on demand.
      if (bare.startsWith(VIRTUAL_LOCALE_PREFIX)) {
        const locale = bare.slice(VIRTUAL_LOCALE_PREFIX.length);
        const localeData = readLocaleResources(
          resolveLocalesDirectory(root, options),
          locale,
        );
        const resources = { [locale]: localeData };
        return `export const resources = ${JSON.stringify(resources)};\nexport default resources;\n`;
      }

      return;
    },
  };
}

export default i18nPlugin;
