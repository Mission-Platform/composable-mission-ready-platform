/**
 * Read/write helpers for the i18n locale files that power the Mission Platform
 * apps, used by the developer MCP's locale-management tools.
 *
 * The discovery logic mirrors `@mission-platform/vite-plugin-i18n`: a member's
 * translations live either in a **nested** tree
 * (`<localesDir>/<code>/<namespace>.yaml`, keys at the file root) or a **flat**
 * layout (`<localesDir>/<code>.yaml`, whose top-level keys are the namespaces),
 * under `locales/` or (legacy) `src/locales/`. Everything here is
 * side-effect-free unless an explicit write function is called.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {basename, extname, join} from 'node:path';

import yaml from 'js-yaml';

import {groupDir, type WorkspaceGroup} from './paths.ts';
import {findMember} from './scanner.ts';

/** The source-of-truth locale every app falls back to. */
export const DEFAULT_LOCALE = 'en';

/** BCP-47 tag validation — lowercase language with optional script/region. */
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i;

export type LocaleLayout = 'nested' | 'flat';

export interface ResolvedLocales {
  /** Absolute path to the resolved locales directory. */
  localesDir: string;
  /** Repo-relative path for human-readable messages. */
  relativeLocalesDir: string;
  layout: LocaleLayout;
  /** Discovered locale codes: default locale first, then the rest alphabetically. */
  locales: string[];
  /**
   * Namespaces present in the default locale. For the nested layout these are
   * the per-locale YAML file base names (e.g. `mp.website`); for the flat
   * layout they are the top-level keys of the `<code>.yaml` file.
   */
  namespaces: string[];
  defaultLocale: string;
}

export interface LocaleCoverage {
  code: string;
  /** Number of leaf (string) keys present. */
  keyCount: number;
  /** Dot-path keys present in the default locale but missing here. */
  missingKeys: string[];
  /** Dot-path keys present here but not in the default locale. */
  extraKeys: string[];
}

function isYamlFile(name: string): boolean {
  return name.endsWith('.yaml') || name.endsWith('.yml');
}

/** Whether `code` is a syntactically valid locale code. */
export function isValidLocaleCode(code: string): boolean {
  return LOCALE_PATTERN.test(code);
}

interface LayoutProbe {
  layout: LocaleLayout;
  codes: string[];
  namespaces: string[];
}

/** Probe a single directory for a nested or flat locale layout. */
function probeLayout(dir: string, defaultLocale: string): LayoutProbe | undefined {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return undefined;
  }
  const nestedCodes: string[] = [];
  const namespaces = new Set<string>();
  const flatCodes: string[] = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.isDirectory()) {
      const localeFiles = readdirSync(join(dir, entry.name)).filter((file) => isYamlFile(file));
      if (localeFiles.length > 0) {
        nestedCodes.push(entry.name);
        for (const file of localeFiles) {
          namespaces.add(basename(file, extname(file)));
        }
      }
    } else if (entry.isFile() && isYamlFile(entry.name)) {
      flatCodes.push(basename(entry.name, extname(entry.name)));
    }
  }
  if (nestedCodes.length > 0) {
    return {
      layout: 'nested',
      codes: nestedCodes,
      namespaces: [...namespaces].toSorted(),
    };
  }
  if (flatCodes.length > 0) {
    // For flat layouts the namespaces are the top-level keys of the default file.
    const flatDefault =
      readFlatFile(join(dir, `${defaultLocale}.yaml`)) ?? readFlatFile(join(dir, `${defaultLocale}.yml`));
    const namespaceKeys = flatDefault ? Object.keys(flatDefault) : [];
    return {
      layout: 'flat',
      codes: flatCodes,
      namespaces: namespaceKeys.toSorted(),
    };
  }
  return undefined;
}

function readFlatFile(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    const parsed = yaml.load(readFileSync(path, 'utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return undefined;
  }
}

/**
 * Resolve the active locales directory and layout for a workspace member.
 * Prefers a populated `locales/` tree, then a populated `src/locales/`.
 * Returns `undefined` when the member ships no YAML translations (e.g. an app
 * that keeps an inline message catalogue).
 */
export function resolveMemberLocales(
  group: WorkspaceGroup,
  name: string,
  defaultLocale: string = DEFAULT_LOCALE,
): ResolvedLocales | undefined {
  const member = findMember(group, name);
  if (!member) {
    throw new Error(`No "${name}" in ${group}/.`);
  }
  const folder = member.relativeDir.split('/')[1] ?? name;
  for (const candidate of ['locales', 'src/locales']) {
    const dir = join(member.dir, candidate);
    const probe = probeLayout(dir, defaultLocale);
    if (probe) {
      const rest = probe.codes.filter((code) => code !== defaultLocale).toSorted();
      const ordered = probe.codes.includes(defaultLocale) ? [defaultLocale, ...rest] : rest;
      return {
        localesDir: dir,
        relativeLocalesDir: `${group}/${folder}/${candidate}`,
        layout: probe.layout,
        locales: ordered,
        namespaces: probe.namespaces,
        defaultLocale,
      };
    }
  }
  return undefined;
}

/** Absolute path to a member's directory (throws if it does not exist). */
export function memberDir(group: WorkspaceGroup, name: string): string {
  const member = findMember(group, name);
  if (!member) {
    throw new Error(`No "${name}" in ${group}/.`);
  }
  return member.dir;
}

/** Path to a single locale's file(s). */
function nestedNamespacePath(resolved: ResolvedLocales, code: string, namespace: string): string {
  return join(resolved.localesDir, code, `${namespace}.yaml`);
}

function flatLocalePath(resolved: ResolvedLocales, code: string): string {
  return join(resolved.localesDir, `${code}.yaml`);
}

/**
 * Read a locale's resources as a `{ [namespace]: messages }` map, normalising
 * both layouts to the nested shape so callers can treat them uniformly.
 */
export function readLocale(resolved: ResolvedLocales, code: string): Record<string, unknown> {
  if (resolved.layout === 'nested') {
    const dir = join(resolved.localesDir, code);
    const out: Record<string, unknown> = {};
    if (!existsSync(dir)) {
      return out;
    }
    for (const file of readdirSync(dir)) {
      if (!isYamlFile(file)) {
        continue;
      }
      const namespace = basename(file, extname(file));
      const parsed = readFlatFile(join(dir, file));
      if (parsed) {
        out[namespace] = parsed;
      }
    }
    return out;
  }
  return readFlatFile(flatLocalePath(resolved, code)) ?? {};
}

/** Deep-flatten a nested object into dot-path -> string entries. */
export function flattenKeys(value: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      Object.assign(out, flattenKeys(child, prefix ? `${prefix}.${key}` : key));
    }
  } else {
    out[prefix] = value == null ? '' : String(value);
  }
  return out;
}

/** Set a dot-path key on a (mutated) nested object, creating intermediates. */
export function setKeyPath(target: Record<string, unknown>, path: string, value: string): void {
  const segments = path.split('.');
  let cursor = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] as string;
    const next = cursor[segment];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments.at(-1) as string] = value;
}

/** Serialise a locale object to YAML matching the repo's conventions. */
export function dumpLocaleYaml(value: unknown): string {
  return yaml.dump(value, {
    sortKeys: true,
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: true,
  });
}

/** Compute each non-default locale's coverage against the default locale. */
export function localeCoverage(resolved: ResolvedLocales): LocaleCoverage[] {
  const defaultFlat = flattenKeys(readLocale(resolved, resolved.defaultLocale));
  const defaultKeys = new Set(Object.keys(defaultFlat));
  return resolved.locales
    .filter((code) => code !== resolved.defaultLocale)
    .map((code) => {
      const flat = flattenKeys(readLocale(resolved, code));
      const keys = new Set(Object.keys(flat));
      return {
        code,
        keyCount: keys.size,
        missingKeys: [...defaultKeys].filter((key) => !keys.has(key)).toSorted(),
        extraKeys: [...keys].filter((key) => !defaultKeys.has(key)).toSorted(),
      };
    });
}

export interface WriteResult {
  applied: boolean;
  files: string[];
  message: string;
}

/**
 * Add a new locale by cloning the default locale's structure. When
 * `fill: 'source'` the default (English) values are copied verbatim as a
 * translation starting point; `fill: 'empty'` writes empty strings.
 */
export function addLocale(
  resolved: ResolvedLocales,
  code: string,
  options: { fill: 'source' | 'empty'; apply: boolean },
): WriteResult {
  if (!isValidLocaleCode(code)) {
    throw new Error(`Invalid locale code "${code}". Use a BCP-47 tag such as "es", "pt-br" or "zh-hans".`);
  }
  if (code === resolved.defaultLocale) {
    throw new Error(`"${code}" is the default locale and already exists.`);
  }
  if (resolved.locales.includes(code)) {
    throw new Error(`Locale "${code}" already exists in ${resolved.relativeLocalesDir}.`);
  }

  const source = readLocale(resolved, resolved.defaultLocale);
  const transform = (object: unknown): unknown => {
    if (object && typeof object === 'object' && !Array.isArray(object)) {
      return Object.fromEntries(
        Object.entries(object as Record<string, unknown>).map(([key, child]) => [key, transform(child)]),
      );
    }
    return options.fill === 'empty' ? '' : object;
  };

  const files: { path: string; relative: string; content: string }[] = [];
  if (resolved.layout === 'nested') {
    for (const [namespace, messages] of Object.entries(source)) {
      files.push({
        path: nestedNamespacePath(resolved, code, namespace),
        relative: `${resolved.relativeLocalesDir}/${code}/${namespace}.yaml`,
        content: dumpLocaleYaml(transform(messages)),
      });
    }
  } else {
    files.push({
      path: flatLocalePath(resolved, code),
      relative: `${resolved.relativeLocalesDir}/${code}.yaml`,
      content: dumpLocaleYaml(transform(source)),
    });
  }

  const relatives = files.map((file) => file.relative).toSorted();
  if (!options.apply) {
    return {
      applied: false,
      files: relatives,
      message: `Dry run — no files written. Pass "apply": true to create locale "${code}" (${files.length} file(s), fill=${options.fill}). Then translate the values and run the app's "format:write" script.`,
    };
  }
  for (const file of files) {
    mkdirSync(join(file.path, '..'), {recursive: true});
    writeFileSync(file.path, file.content, 'utf8');
  }
  return {
    applied: true,
    files: relatives,
    message: `Created locale "${code}" (${files.length} file(s)). Next: translate the values, then run the app's "format:write" script — the plugin regenerates the "virtual:i18n-locales" type shim on the next dev/build.`,
  };
}

/** Remove a locale entirely. Refuses to delete the default locale. */
export function removeLocale(resolved: ResolvedLocales, code: string, apply: boolean): WriteResult {
  if (code === resolved.defaultLocale) {
    throw new Error(`Refusing to remove the default locale "${code}".`);
  }
  if (!resolved.locales.includes(code)) {
    throw new Error(`Locale "${code}" does not exist in ${resolved.relativeLocalesDir}.`);
  }
  const targets: { path: string; relative: string }[] =
    resolved.layout === 'nested'
      ? [
        {
          path: join(resolved.localesDir, code),
          relative: `${resolved.relativeLocalesDir}/${code}/`,
        },
      ]
      : [
        {
          path: flatLocalePath(resolved, code),
          relative: `${resolved.relativeLocalesDir}/${code}.yaml`,
        },
      ];

  const relatives = targets.map((target) => target.relative);
  if (!apply) {
    return {
      applied: false,
      files: relatives,
      message: `Dry run — nothing deleted. Pass "apply": true to remove locale "${code}" (${relatives.join(', ')}).`,
    };
  }
  for (const target of targets) {
    rmSync(target.path, {recursive: true, force: true});
  }
  return {
    applied: true,
    files: relatives,
    message: `Removed locale "${code}". The plugin drops it from "virtual:i18n-locales" on the next dev/build.`,
  };
}

export interface UpdateTranslationRequest {
  resolved: ResolvedLocales;
  code: string;
  /** Nested layout namespace (defaults to the sole namespace when unambiguous). */
  namespace?: string;
  /** Dot-path key (within the namespace) -> new value. */
  entries: Record<string, string>;
  apply: boolean;
}

/** Update one or more translation values in a single locale's namespace file. */
export function updateTranslation(request: UpdateTranslationRequest): WriteResult & { updatedKeys: string[] } {
  const {resolved, code, entries, apply} = request;
  if (!resolved.locales.includes(code)) {
    throw new Error(`Locale "${code}" does not exist in ${resolved.relativeLocalesDir}. Add it first with add_locale.`);
  }
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    throw new Error('Provide at least one entry (dot-path key -> value) to update.');
  }

  if (resolved.layout === 'nested') {
    let namespace = request.namespace;
    if (!namespace) {
      if (resolved.namespaces.length === 1) {
        namespace = resolved.namespaces[0];
      } else {
        throw new Error(
          `This member has multiple namespaces (${resolved.namespaces.join(', ')}). Pass "namespace" explicitly.`,
        );
      }
    } else if (!resolved.namespaces.includes(namespace)) {
      throw new Error(`Unknown namespace "${namespace}". One of: ${resolved.namespaces.join(', ')}.`);
    }
    const path = nestedNamespacePath(resolved, code, namespace);
    const relative = `${resolved.relativeLocalesDir}/${code}/${namespace}.yaml`;
    const current = readFlatFile(path) ?? {};
    for (const [key, value] of Object.entries(entries)) {
      setKeyPath(current, key, value);
    }
    const content = dumpLocaleYaml(current);
    if (!apply) {
      return {
        applied: false,
        files: [relative],
        updatedKeys: keys,
        message: `Dry run — no files written. Pass "apply": true to update ${keys.length} key(s) in ${relative}.`,
      };
    }
    mkdirSync(join(path, '..'), {recursive: true});
    writeFileSync(path, content, 'utf8');
    return {
      applied: true,
      files: [relative],
      updatedKeys: keys,
      message: `Updated ${keys.length} key(s) in ${relative}. Run the app's "format:write" script to normalise formatting.`,
    };
  }

  // Flat layout: keys are prefixed by their namespace inside the single file.
  const path = flatLocalePath(resolved, code);
  const relative = `${resolved.relativeLocalesDir}/${code}.yaml`;
  const current = readFlatFile(path) ?? {};
  for (const [key, value] of Object.entries(entries)) {
    const fullKey = request.namespace ? `${request.namespace}.${key}` : key;
    setKeyPath(current, fullKey, value);
  }
  const content = dumpLocaleYaml(current);
  if (!apply) {
    return {
      applied: false,
      files: [relative],
      updatedKeys: keys,
      message: `Dry run — no files written. Pass "apply": true to update ${keys.length} key(s) in ${relative}.`,
    };
  }
  writeFileSync(path, content, 'utf8');
  return {
    applied: true,
    files: [relative],
    updatedKeys: keys,
    message: `Updated ${keys.length} key(s) in ${relative}. Run the app's "format:write" script to normalise formatting.`,
  };
}

/** Survey every member of a group that ships YAML translations. */
export function surveyLocales(group: WorkspaceGroup): {
  name: string;
  relativeLocalesDir: string;
  layout: LocaleLayout;
  locales: string[];
}[] {
  const base = groupDir(group);
  if (!existsSync(base)) {
    return [];
  }
  const out: {
    name: string;
    relativeLocalesDir: string;
    layout: LocaleLayout;
    locales: string[];
  }[] = [];
  for (const entry of readdirSync(base, {withFileTypes: true})) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      const resolved = resolveMemberLocales(group, entry.name);
      if (resolved) {
        out.push({
          name: entry.name,
          relativeLocalesDir: resolved.relativeLocalesDir,
          layout: resolved.layout,
          locales: resolved.locales,
        });
      }
    } catch {
      // Skip members without a manifest / locales.
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
