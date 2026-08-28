import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { dashedName, flattenTokens, isAlias, type DtcgGroup, type TokenRecord } from './dtcg.js';
import { buildTypographyRecords } from './generators/scss.js';

/** Evidence collected for one token leaf. */
export type TokenUsageEvidence = 'css' | 'scss' | 'typescript' | 'alias' | 'override' | 'mcp' | 'docs' | 'public-api';

/** Classification assigned by the conservative reachability audit. */
export type TokenUsageStatus = 'active' | 'protected' | 'ambiguous' | 'candidate';

/** One flattened token leaf and the evidence used to classify it. */
export interface TokenUsageRecord {
  sourceId: string;
  path: string;
  generatedNames: string[];
  evidence: TokenUsageEvidence[];
  status: TokenUsageStatus;
  reason?: string;
}

/** One alias edge, including aliases nested in arrays and composite values. */
export interface TokenAliasEdge {
  sourceId: string;
  from: string;
  to: string;
  resolved: boolean;
}

/** Stable, reviewable output of {@link collectTokenReachability}. */
export interface TokenReachabilityReport {
  version: 1;
  prefix: string;
  sources: string[];
  aliases: TokenAliasEdge[];
  tokens: TokenUsageRecord[];
  summary: Record<TokenUsageStatus, number>;
}

/** Options for collecting a repository token reachability report. */
export interface TokenReachabilityOptions {
  /** Absolute path to `packages/tokens/tokens`. */
  tokensDir: string;
  /** Absolute repository root used for consumer scanning. */
  repositoryRoot: string;
  /** CSS custom-property prefix. Defaults to `mp`. */
  prefix?: string;
  /** Additional roots to scan, useful for isolated fixtures and plugin tests. */
  consumerRoots?: string[];
  /** Skip repository scanning while testing the alias graph in isolation. */
  scanConsumers?: boolean;
}

interface SourceDocument {
  sourceId: string;
  document: DtcgGroup;
  kind: 'structural' | 'typography' | 'component' | 'theme';
  namespace?: string;
}

interface MutableUsage {
  evidence: Set<TokenUsageEvidence>;
  reasons: Set<string>;
  direct: boolean;
  protected: boolean;
  ambiguous: boolean;
}

interface IndexedToken {
  source: SourceDocument;
  path: string;
  generatedNames: string[];
  aliases: string[];
}

const CONSUMER_EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.json',
  '.less',
  '.md',
  '.mdx',
  '.sass',
  '.scss',
  '.svelte',
  '.ts',
  '.tsx',
  '.vue',
  '.js',
  '.jsx',
]);

const SKIPPED_DIRECTORY_NAMES = new Set([
  '.git',
  '.junie',
  '.turbo',
  '.cache',
  '__snapshots__',
  'assets',
  'build',
  'coverage',
  'dist',
  'e2e',
  'generated',
  'fixtures',
  'node_modules',
  'playwright-report',
  'public',
  'static',
  'storybook-static',
  'test',
  'tests',
  'target',
  '__fixtures__',
  '__tests__',
  'vendor',
]);

const SCSS_DYNAMIC_USAGE =
  /(?:\$#\{|#\{\$[A-Za-z_][A-Za-z0-9_-]*\}|map\.(?:get|deep-get|keys|values)\s*\(|@each\s+\$[A-Za-z_][A-Za-z0-9_-]*)/;
const SCSS_INTERPOLATED_NAME = /(?:--mp-|\$)[A-Za-z0-9_-]*#\{\$[A-Za-z_][A-Za-z0-9_-]*\}[A-Za-z0-9_-]*/g;
const TYPESCRIPT_DYNAMIC_USAGE = [
  /keyof\s+typeof/,
  /Object\.(?:keys|entries|values)\s*\(/,
  /\b[\w$]+(?:\.[\w$]+)*\s*\[\s*['"][^'"]+['"]\s*\]/,
  /\b[\w$]+(?:\.[\w$]+)*\s*\[\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\]/,
];
const TOKEN_CONTEXT = /(?:token|design[- ]?tokens?|var\(--mp-|component\.|palette\.|typography\.|spacing\.|font\.)/i;

const escapeRegExp = (value: string): string => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

function readJson(filePath: string): DtcgGroup {
  return JSON.parse(readFileSync(filePath, 'utf8')) as DtcgGroup;
}

function sourceFiles(tokensDirectory: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      else if (entry.isFile() && entry.name.endsWith('.tokens.json')) files.push(filePath);
    }
  };
  visit(tokensDirectory);
  return files;
}

function sourceNamespace(document: DtcgGroup): string | undefined {
  const component = document.component;
  if (typeof component !== 'object' || component === null || Array.isArray(component)) return undefined;
  return Object.keys(component as DtcgGroup).find((key) => !key.startsWith('$'));
}

function discoverSources(tokensDirectory: string): SourceDocument[] {
  const byId = new Map<string, SourceDocument>();
  for (const filePath of sourceFiles(tokensDirectory)) {
    const sourceId = path
      .relative(tokensDirectory, filePath)
      .replaceAll(path.sep, '/')
      .replace(/\.tokens\.json$/, '');
    // The monolith is a parity baseline, not another generated source owner.
    if (sourceId === 'component') continue;
    const document = readJson(filePath);
    const kind = sourceId.startsWith('component/')
      ? 'component'
      : sourceId === 'typography'
        ? 'typography'
        : sourceId === 'theme-light' || sourceId === 'theme-dark'
          ? 'theme'
          : 'structural';
    byId.set(sourceId, {
      sourceId,
      document,
      kind,
      namespace: kind === 'component' ? sourceNamespace(document) : undefined,
    });
  }
  // Keep fixtures useful when they intentionally contain only a subset of fixed files.
  return [...byId.values()].toSorted((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function aliasesIn(value: unknown): string[] {
  if (typeof value === 'string') {
    const matches = [...value.matchAll(/\{([A-Za-z0-9_.-]+)\}/g)].map((match) => `{${match[1]}}`);
    return matches.length > 0 ? matches : isAlias(value) ? [value] : [];
  }
  if (Array.isArray(value)) return value.flatMap((entry) => aliasesIn(entry));
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap((entry) => aliasesIn(entry));
  return [];
}

function projectedName(source: SourceDocument, record: TokenRecord): string {
  return source.kind === 'component' && source.namespace
    ? [source.namespace, ...record.path.slice(2)].join('-')
    : dashedName(record);
}

function indexedTokens(sources: SourceDocument[], prefix: string): IndexedToken[] {
  return sources.flatMap((source) => {
    const records =
      source.kind === 'typography' && typeof source.document.typography === 'object'
        ? buildTypographyRecords(source.document.typography as DtcgGroup, prefix)
        : flattenTokens(source.document);
    const rawTypography =
      source.kind === 'typography' && typeof source.document.typography === 'object'
        ? new Map(flattenTokens(source.document).map((record) => [record.path.join('.'), record]))
        : undefined;
    return records.map((record) => {
      const stablePath = record.path.join('.');
      const projected = projectedName(source, record);
      const [namespace, variant, field] = record.path;
      const rawRecord = rawTypography?.get(`${namespace}.${variant}`);
      const rawField = field?.replaceAll(/-([a-z])/g, (_, character: string) => character.toUpperCase());
      return {
        source,
        path: stablePath,
        generatedNames: [`--${prefix}-${projected}`, `$${projected}`],
        aliases:
          rawRecord && rawField && typeof rawRecord.value === 'object' && rawRecord.value !== null
            ? aliasesIn((rawRecord.value as DtcgGroup)[rawField])
            : aliasesIn(record.value),
      };
    });
  });
}

function addEvidence(
  usage: MutableUsage,
  evidence: TokenUsageEvidence,
  reason: string,
  status: 'direct' | 'protected' | 'ambiguous',
): void {
  usage.evidence.add(evidence);
  usage.reasons.add(reason);
  if (status === 'direct') usage.direct = true;
  if (status === 'protected') usage.protected = true;
  if (status === 'ambiguous') usage.ambiguous = true;
}

function pathPattern(path_: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(path_)}(?![A-Za-z0-9_-])`);
}

function sourceObjectName(source: SourceDocument): string | undefined {
  if (source.kind === 'component') return source.namespace;
  const sourceName = source.sourceId.split('/').at(-1);
  return sourceName?.replaceAll(/-([a-z])/g, (_, character: string) => character.toUpperCase());
}

function hasTypeScriptAccess(text: string, token: IndexedToken): boolean {
  const sourceName = sourceObjectName(token.source);
  const paths =
    sourceName && !token.path.startsWith(`${sourceName}.`) ? [`${sourceName}.${token.path}`, token.path] : [token.path];
  if (paths.some((tokenPath) => pathPattern(tokenPath).test(text))) return true;
  const tokenPath = paths[0];
  const segments = tokenPath.split('.');
  if (segments.length < 2) return false;
  const access = segments
    .map((segment, index) =>
      index === 0
        ? escapeRegExp(segment)
        : String.raw`(?:\.${escapeRegExp(segment)}|\[['"]${escapeRegExp(segment)}['"]\]|\[${escapeRegExp(segment)}\])`,
    )
    .join('');
  return new RegExp(`(?<![A-Za-z0-9_$])${access}(?![A-Za-z0-9_$])`).test(text);
}

function dynamicBranchMatches(text: string, token: IndexedToken): boolean {
  // A static generated-name match is a precise root. Do not turn it into an
  // ambiguous branch merely because the same file contains an unrelated loop
  // or keyed access.
  if (
    text.includes(token.generatedNames[0]) ||
    text.includes(token.generatedNames[1]) ||
    pathPattern(token.path).test(text)
  )
    return false;
  const sourceName = sourceObjectName(token.source);
  const qualifiedPath =
    sourceName && !token.path.startsWith(`${sourceName}.`) ? `${sourceName}.${token.path}` : token.path;
  const segments = qualifiedPath.split('.');
  let longestPath = '';
  for (let index = 1; index <= segments.length; index += 1) {
    const branch = segments.slice(0, index).join('.');
    const escapedBranch = escapeRegExp(branch);
    const branchAccess = new RegExp(
      String.raw`(?:keyof\s+typeof\s+|Object\.(?:keys|entries|values)\s*\(\s*)${escapedBranch}(?![A-Za-z0-9_.-])|${escapedBranch}\s*\[`,
    );
    if (text.includes(branch) && branchAccess.test(text)) longestPath = branch;
  }
  if (longestPath) return qualifiedPath === longestPath || qualifiedPath.startsWith(`${longestPath}.`);
  const generatedName = token.generatedNames[0];
  const interpolatedNames = [...text.matchAll(SCSS_INTERPOLATED_NAME)];
  return interpolatedNames.some((match) => {
    const expression = match[0];
    const interpolation = expression.indexOf('#{');
    const prefix = expression.slice(0, interpolation);
    const suffix = expression.slice(expression.indexOf('}', interpolation) + 1);
    return generatedName.startsWith(prefix) && generatedName.endsWith(suffix);
  });
}

function hasDynamicUsage(text: string, filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.scss' || extension === '.sass') return SCSS_DYNAMIC_USAGE.test(text);
  if (['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(extension)) {
    return TYPESCRIPT_DYNAMIC_USAGE.some((pattern) => pattern.test(text));
  }
  return false;
}

function shouldSkip(filePath: string, tokensDirectory: string, reportFile: string): boolean {
  const normalized = filePath.replaceAll(path.sep, '/');
  const normalizedTokens = tokensDirectory.replaceAll(path.sep, '/').replace(/\/$/, '');
  const baseName = path.basename(filePath);
  return (
    normalized === reportFile.replaceAll(path.sep, '/') ||
    normalized.endsWith('/vite-plugins/tokens/src/reachability.ts') ||
    normalized.endsWith('/vite-plugins/tokens/src/reachability.spec.ts') ||
    normalized.startsWith(`${normalizedTokens}/`) ||
    /(?:^|[._-])(spec|test)\.[^.]+$/i.test(baseName) ||
    /^(?:spec|test)\.[^.]+$/i.test(baseName) ||
    normalized.split('/').some((segment) => SKIPPED_DIRECTORY_NAMES.has(segment))
  );
}

function consumerFiles(root: string, tokensDirectory: string, reportFile: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkip(filePath, tokensDirectory, reportFile)) visit(filePath);
      } else if (
        entry.isFile() &&
        CONSUMER_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) &&
        !shouldSkip(filePath, tokensDirectory, reportFile)
      ) {
        files.push(filePath);
      }
    }
  };
  visit(root);
  return files;
}

function usageForOverrideDocument(
  document: DtcgGroup,
  tokens: IndexedToken[],
  usages: Map<IndexedToken, MutableUsage>,
): void {
  for (const override of flattenTokens(document)) {
    const overridePath = override.path.join('.');
    for (const token of tokens.filter(({ path: tokenPath }) => tokenPath === overridePath)) {
      addEvidence(
        usages.get(token) as MutableUsage,
        'override',
        'Referenced by a repository runtime override document.',
        'protected',
      );
    }
  }
}

interface TokenIndexes {
  byGeneratedName: Map<string, IndexedToken[]>;
  byPath: Map<string, IndexedToken[]>;
  bySource: Map<string, IndexedToken[]>;
  byComponentNamespace: Map<string, IndexedToken[]>;
}

function addTokenIndexEntry(map: Map<string, IndexedToken[]>, key: string, token: IndexedToken): void {
  map.set(key, [...(map.get(key) ?? []), token]);
}

function buildTokenIndexes(tokens: IndexedToken[]): TokenIndexes {
  const indexes: TokenIndexes = {
    byGeneratedName: new Map(),
    byPath: new Map(),
    bySource: new Map(),
    byComponentNamespace: new Map(),
  };
  for (const token of tokens) {
    for (const generatedName of token.generatedNames) addTokenIndexEntry(indexes.byGeneratedName, generatedName, token);
    addTokenIndexEntry(indexes.byPath, token.path, token);
    addTokenIndexEntry(indexes.bySource, token.source.sourceId, token);
    if (token.source.kind === 'component' && token.source.namespace)
      addTokenIndexEntry(indexes.byComponentNamespace, token.source.namespace, token);
  }
  return indexes;
}

function buildCompositeAliasTargets(tokens: IndexedToken[]): Map<string, IndexedToken[]> {
  const targets = new Map<string, IndexedToken[]>();
  for (const token of tokens) {
    if (token.source.kind !== 'typography') continue;
    const segments = token.path.split('.');
    if (segments.length < 3) continue;
    const compositePath = segments.slice(0, 2).join('.');
    targets.set(compositePath, [...(targets.get(compositePath) ?? []), token]);
  }
  return targets;
}

function normalizeContractSelector(selector: string): string {
  return selector
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.?\//, '')
    .replace(/^tokens\//, '')
    .replace(/\.tokens\.json$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function mcpContractMatch(text: string, token: IndexedToken): boolean {
  for (const match of text.matchAll(/(?:readTokens|listOverridableTokenVariables)\s*\(\s*['"]([^'"]+)['"]/g)) {
    const selector = normalizeContractSelector(match[1]);
    const sourceId = token.source.sourceId.toLowerCase();
    if (sourceId === selector || sourceId.startsWith(`${selector}/`)) return true;
  }
  return false;
}

function publicApiContractMatch(text: string, token: IndexedToken): boolean {
  if (hasTypeScriptAccess(text, token)) return true;
  for (const match of text.matchAll(/(?:keyof\s+typeof|typeof)\s+([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z0-9_$-]+)+)/g)) {
    const branch = match[1];
    if (token.path === branch || token.path.startsWith(`${branch}.`)) return true;
  }
  return false;
}

function matchingTokens(
  text: string,
  filePath: string,
  tokens: IndexedToken[],
  indexes: TokenIndexes,
  usages: Map<IndexedToken, MutableUsage>,
): Set<IndexedToken> {
  const matches = new Set<IndexedToken>();
  const generatedPattern = /--mp-[A-Za-z0-9_-]+|\$[A-Za-z0-9_-]+/g;
  for (const match of text.matchAll(generatedPattern)) {
    for (const token of indexes.byGeneratedName.get(match[0]) ?? []) matches.add(token);
  }
  const pathPattern_ = /[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)+/g;
  for (const match of text.matchAll(pathPattern_)) {
    for (const token of indexes.byPath.get(match[0]) ?? []) matches.add(token);
  }

  const normalized = filePath.replaceAll(path.sep, '/');
  const isMcp = normalized.includes('/mcp/');
  const isPublicApi = normalized.endsWith('/packages/tokens/src/tokens.ts');
  const isOverride = normalized.includes('/overrides') || normalized.includes('/design-tokens/');
  const isDocumentation = ['.md', '.mdx'].includes(path.extname(filePath).toLowerCase());
  const isTypeScript = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(path.extname(filePath).toLowerCase());
  if (isTypeScript) {
    const indexedAccess =
      /(?<object>[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\[\s*(?:(?<quote>['"])(?<quotedKey>[^'"]+)\k<quote>|(?<numericKey>\d+))\s*\]/g;
    for (const access of text.matchAll(indexedAccess)) {
      const objectPath = access.groups?.object;
      const key = access.groups?.quotedKey ?? access.groups?.numericKey;
      if (!objectPath || !key) continue;
      const accessPath = `${objectPath}.${key}`;
      const paths = [accessPath, accessPath.slice(accessPath.indexOf('.') + 1)];
      for (const path_ of paths) for (const token of indexes.byPath.get(path_) ?? []) matches.add(token);
    }
  }
  const dynamic = hasDynamicUsage(text, filePath) && TOKEN_CONTEXT.test(text);
  if (isMcp) {
    for (const token of tokens) if (mcpContractMatch(text, token)) matches.add(token);
  }
  if (isPublicApi) {
    for (const token of tokens) if (publicApiContractMatch(text, token)) matches.add(token);
  }
  if (isDocumentation) {
    for (const match of text.matchAll(/component\.([A-Za-z0-9-]+)/g)) {
      for (const token of indexes.byComponentNamespace.get(match[1]) ?? []) matches.add(token);
    }
  }
  if (dynamic) {
    for (const [sourceId, sourceTokens] of indexes.bySource) {
      const source = sourceTokens[0]?.source;
      if (!source) continue;
      if (text.includes(sourceId) || text.includes(source.namespace ?? sourceId.split('/').at(-1) ?? '')) {
        for (const token of sourceTokens) {
          if (!matches.has(token) && dynamicBranchMatches(text, token)) matches.add(token);
        }
      }
    }
  }
  if (isOverride && path.extname(filePath).toLowerCase() === '.json') {
    try {
      usageForOverrideDocument(JSON.parse(text) as DtcgGroup, tokens, usages);
    } catch {
      // Invalid non-token JSON is still scanned by generated/path matches.
    }
  }
  return matches;
}

function scanConsumers(
  options: TokenReachabilityOptions,
  tokens: IndexedToken[],
  usages: Map<IndexedToken, MutableUsage>,
): void {
  const reportFile = path.join(
    options.repositoryRoot,
    'vite-plugins/tokens/src/fixtures/token-reachability.report.json',
  );
  const indexes = buildTokenIndexes(tokens);
  const roots = options.consumerRoots ?? [options.repositoryRoot];
  for (const root of roots.toSorted()) {
    for (const filePath of consumerFiles(root, options.tokensDir, reportFile)) {
      const text = readFileSync(filePath, 'utf8');
      const normalized = filePath.replaceAll(path.sep, '/');
      const extension = path.extname(filePath).toLowerCase();
      const isMcp = normalized.includes('/mcp/');
      const isPublicApi = normalized.endsWith('/packages/tokens/src/tokens.ts');
      const isOverride = normalized.includes('/overrides') || normalized.includes('/design-tokens/');
      if (!isMcp && !isPublicApi && !isOverride && !text.includes('--mp-') && !TOKEN_CONTEXT.test(text)) continue;
      const isScss = extension === '.scss' || extension === '.sass';
      const isCss =
        isScss || extension === '.css' || extension === '.vue' || extension === '.svelte' || extension === '.astro';
      const isTypeScript = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(extension);
      const isDocumentation = extension === '.md' || extension === '.mdx';
      const dynamic = hasDynamicUsage(text, filePath) && TOKEN_CONTEXT.test(text);

      for (const token of matchingTokens(text, filePath, tokens, indexes, usages)) {
        const usage = usages.get(token) as MutableUsage;
        const generatedMatch = text.includes(token.generatedNames[0]);
        const scssMatch = isScss && text.includes(token.generatedNames[1]);
        const pathMatch = isTypeScript ? hasTypeScriptAccess(text, token) : pathPattern(token.path).test(text);
        if (generatedMatch && isCss)
          addEvidence(usage, 'css', `Uses generated CSS custom property ${token.generatedNames[0]}.`, 'direct');
        if (scssMatch) addEvidence(usage, 'scss', `Uses generated SCSS variable ${token.generatedNames[1]}.`, 'direct');
        if (pathMatch) {
          const evidence: TokenUsageEvidence = isMcp
            ? 'mcp'
            : isPublicApi
              ? 'public-api'
              : isOverride
                ? 'override'
                : isDocumentation
                  ? 'docs'
                  : isTypeScript
                    ? 'typescript'
                    : 'css';
          const status =
            evidence === 'docs' || evidence === 'override' || evidence === 'public-api' || evidence === 'mcp'
              ? 'protected'
              : 'direct';
          addEvidence(usage, evidence, `References stable DTCG path ${token.path}.`, status);
        }

        // The component reference describes a contract branch, not only the line
        // containing one leaf. Protect every descendant of a documented layer.
        if (
          isDocumentation &&
          token.path.startsWith('component.') &&
          text.includes(`component.${token.path.split('.')[1]}`)
        ) {
          addEvidence(
            usage,
            'docs',
            `Documented component contract branch component.${token.path.split('.')[1]}.`,
            'protected',
          );
        }

        if (isPublicApi && publicApiContractMatch(text, token) && token.source.kind !== 'theme') {
          addEvidence(
            usage,
            'public-api',
            'An explicit package API contract references this token branch.',
            'protected',
          );
        }
        if (isMcp && mcpContractMatch(text, token)) {
          addEvidence(usage, 'mcp', 'An explicit MCP source/category selector exposes this token branch.', 'protected');
        }
        if (dynamic && !(generatedMatch || scssMatch || pathMatch) && dynamicBranchMatches(text, token)) {
          addEvidence(
            usage,
            isScss ? 'scss' : 'typescript',
            `Dynamic access protects the ${token.source.sourceId} branch.`,
            'ambiguous',
          );
        }
      }
    }
  }
}

function aliasesForToken(
  token: IndexedToken,
  byPath: Map<string, IndexedToken[]>,
  compositeTargets: Map<string, IndexedToken[]>,
): IndexedToken[] {
  return token.aliases.flatMap((alias) => {
    const targetPath = alias.slice(1, -1);
    const direct = byPath.get(targetPath) ?? compositeTargets.get(targetPath) ?? [];
    if (token.source.kind === 'theme') return direct.filter(({ source }) => source.sourceId === 'palette');
    if (token.source.kind === 'typography')
      return direct.filter(({ source }) => source.sourceId === 'font' || source.sourceId === 'spacing');
    if (token.source.kind === 'component') {
      return direct.filter(({ source }) => source.kind !== 'theme' || source.sourceId === 'theme-light');
    }
    return direct;
  });
}

/** Collect a deterministic conservative reachability report without changing token sources. */
export function collectTokenReachability(options: TokenReachabilityOptions): TokenReachabilityReport {
  const prefix = options.prefix ?? 'mp';
  const sources = discoverSources(options.tokensDir);
  const tokens = indexedTokens(sources, prefix);
  const usages = new Map<IndexedToken, MutableUsage>(
    tokens.map((token) => [
      token,
      {
        evidence: new Set<TokenUsageEvidence>(),
        reasons: new Set<string>(),
        direct: false,
        protected: false,
        ambiguous: false,
      },
    ]),
  );
  if (options.scanConsumers !== false) scanConsumers(options, tokens, usages);

  const byPath = new Map<string, IndexedToken[]>();
  for (const token of tokens) byPath.set(token.path, [...(byPath.get(token.path) ?? []), token]);
  const compositeTargets = buildCompositeAliasTargets(tokens);
  const aliases: TokenAliasEdge[] = [];
  const incoming = new Map<IndexedToken, number>();
  const outgoing = new Map<IndexedToken, IndexedToken[]>();
  for (const token of tokens) {
    const targets = aliasesForToken(token, byPath, compositeTargets);
    outgoing.set(token, targets);
    for (const alias of token.aliases) {
      const targetPath = alias.slice(1, -1);
      const resolved =
        targets.some(({ path: resolvedPath }) => resolvedPath === targetPath) ||
        (compositeTargets.get(targetPath)?.some((target) => targets.includes(target)) ?? false);
      aliases.push({ sourceId: token.source.sourceId, from: token.path, to: targetPath, resolved });
      for (const target of targets) incoming.set(target, (incoming.get(target) ?? 0) + 1);
      if (!resolved) {
        const usage = usages.get(token) as MutableUsage;
        usage.ambiguous = true;
        usage.reasons.add(`Alias ${alias} does not resolve to a known token source.`);
      }
    }
  }

  // Generation emits theme colours as light-dark(light, dark) under one CSS name
  // driven by theme-light. Index dark twins by that shared generated name so a
  // reachable light leaf also keeps the dark half that supplies the pair.
  const themeDarkByCssName = new Map<string, IndexedToken>();
  for (const token of tokens) {
    if (token.source.sourceId === 'theme-dark') themeDarkByCssName.set(token.generatedNames[0], token);
  }

  // Follow aliases from every consumer root. A dynamic/protected source keeps its
  // dependency, while an ordinary static root activates only its transitive targets.
  const queue = tokens.filter((token) => {
    const usage = usages.get(token) as MutableUsage;
    return usage.direct || usage.protected || usage.ambiguous;
  });
  const visited = new Set<IndexedToken>();
  const markDependency = (
    target: IndexedToken,
    current: IndexedToken,
    currentUsage: MutableUsage,
    reason: string,
    inheritStatus: boolean,
  ): void => {
    const targetUsage = usages.get(target) as MutableUsage;
    targetUsage.evidence.add('alias');
    targetUsage.reasons.add(reason);
    // Theme light/dark twins share one emitted CSS custom property, so the dark
    // half must inherit protected/ambiguous status. Ordinary alias edges only
    // need to stay reachable (active) unless the source branch is ambiguous.
    if (inheritStatus && currentUsage.protected) {
      targetUsage.protected = true;
    } else if (currentUsage.ambiguous) {
      targetUsage.ambiguous = true;
      targetUsage.reasons.add(`Dependency of an ambiguous ${current.source.sourceId} branch.`);
    } else {
      targetUsage.direct = true;
    }
    queue.push(target);
  };
  while (queue.length > 0) {
    const current = queue.shift() as IndexedToken;
    if (visited.has(current)) continue;
    visited.add(current);
    const currentUsage = usages.get(current) as MutableUsage;
    for (const target of outgoing.get(current) ?? []) {
      markDependency(
        target,
        current,
        currentUsage,
        `Required by alias from ${current.source.sourceId}:${current.path}.`,
        false,
      );
    }
    if (current.source.sourceId === 'theme-light') {
      const darkTwin = themeDarkByCssName.get(current.generatedNames[0]);
      if (darkTwin) {
        markDependency(
          darkTwin,
          current,
          currentUsage,
          `Theme-dark twin of reachable theme-light ${current.path} via shared light-dark() CSS name ${current.generatedNames[0]}.`,
          true,
        );
      }
    }
  }

  const reportTokens = tokens
    .map((token): TokenUsageRecord => {
      const usage = usages.get(token) as MutableUsage;
      const status: TokenUsageStatus = usage.protected
        ? 'protected'
        : usage.ambiguous
          ? 'ambiguous'
          : usage.direct || (incoming.get(token) ?? 0) > 0
            ? 'active'
            : 'candidate';
      return {
        sourceId: token.source.sourceId,
        path: token.path,
        generatedNames: token.generatedNames,
        evidence: [...usage.evidence].toSorted(),
        status,
        ...(usage.reasons.size > 0 ? { reason: [...usage.reasons].toSorted().join(' ') } : {}),
      };
    })
    .toSorted((a, b) => a.path.localeCompare(b.path) || a.sourceId.localeCompare(b.sourceId));
  const summary = {
    active: reportTokens.filter(({ status }) => status === 'active').length,
    protected: reportTokens.filter(({ status }) => status === 'protected').length,
    ambiguous: reportTokens.filter(({ status }) => status === 'ambiguous').length,
    candidate: reportTokens.filter(({ status }) => status === 'candidate').length,
  } satisfies Record<TokenUsageStatus, number>;
  return {
    version: 1,
    prefix,
    sources: sources.map(({ sourceId }) => sourceId).toSorted(),
    aliases: aliases.toSorted((a, b) =>
      `${a.sourceId}:${a.from}:${a.to}`.localeCompare(`${b.sourceId}:${b.from}:${b.to}`),
    ),
    tokens: reportTokens,
    summary,
  };
}

/** Write a report with stable formatting suitable for review and source control. */
export function writeTokenReachabilityReport(report: TokenReachabilityReport, filePath: string): void {
  writeFileSync(filePath, `${JSON.stringify(report, undefined, 2)}\n`);
}
