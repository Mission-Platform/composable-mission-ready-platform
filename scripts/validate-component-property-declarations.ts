#!/usr/bin/env node

/**
 * Validate the local declaration contract for component-owned custom properties.
 *
 * Usage:
 *   node --experimental-strip-types scripts/validate-component-property-declarations.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type DeclarationIssueKind = 'missing' | 'duplicate' | 'orphaned' | 'unresolved';

export interface ComponentPropertyUsage {
  readonly property: string;
  readonly fallback?: string;
  readonly syntax: '*';
  readonly inherits: true;
}

export interface DeclarationIssue {
  readonly kind: DeclarationIssueKind;
  readonly modulePath: string;
  readonly property: string;
  readonly message: string;
}

export interface DeclarationValidationReport {
  readonly modules: number;
  readonly forgeModules: number;
  readonly usages: number;
  readonly registrations: number;
  readonly issues: readonly DeclarationIssue[];
}

interface SourceFile {
  readonly path: string;
  readonly source: string;
}

interface Range {
  readonly start: number;
  readonly end: number;
}

interface LoopContext extends Range {
  readonly values: Readonly<Record<string, readonly string[]>>;
}

interface MixinContext extends Range {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly invocations: readonly Readonly<Record<string, string>>[];
}

interface ExtractedUsage {
  readonly property: string;
  readonly fallback?: string;
  readonly unresolved: boolean;
}

const propertyPattern = /--forge-[a-z0-9_-]+(?:#\{\$[a-z0-9_-]+\}[a-z0-9_-]*)*/gi;
const declarationPattern = /@property\s+(--forge-[a-z0-9_-]+(?:#\{\$[a-z0-9_-]+\}[a-z0-9_-]*)*)/gi;
const usePattern = /@(use|forward|import)\s+['"](\.[^'"]+)['"]\s*;?/g;

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '');
}

function withoutPropertyDeclarations(source: string): string {
  let result = source;
  const propertyStartPattern = /@property\s+--forge-[a-z0-9_#{}`$-]+\s*\{/gi;
  for (const match of source.matchAll(propertyStartPattern)) {
    const opening = (match.index ?? 0) + match[0].length - 1;
    const closing = matchingBrace(source, opening);
    if (closing !== -1)
      result = result.slice(0, match.index) + ' '.repeat(closing + 1 - (match.index ?? 0)) + result.slice(closing + 1);
  }
  return result;
}

function matchingBrace(source: string, opening: number): number {
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}' && --depth === 0) return index;
  }
  return -1;
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  let quote: string | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== '\\') quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    else if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === '{') braces += 1;
    else if (character === '}') braces -= 1;
    else if (character === separator && parentheses === 0 && brackets === 0 && braces === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function scalar(value: string): string | undefined {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '');
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : undefined;
}

function parseLoopValues(header: string, variables: readonly string[]): Readonly<Record<string, readonly string[]>> {
  const expression = header.trim().replace(/^\(|\)$/g, '');
  if (variables.length === 2) {
    const values: Record<string, string[]> = { [variables[0]]: [], [variables[1]]: [] };
    for (const pair of splitTopLevel(expression, ',')) {
      const [key, value] = splitTopLevel(pair, ':');
      const keyValue = key === undefined ? undefined : scalar(key);
      const valueValue = value === undefined ? undefined : scalar(value);
      if (keyValue) {
        values[variables[0]].push(keyValue);
        if (valueValue) values[variables[1]].push(valueValue);
      }
    }
    return values;
  }
  const values = splitTopLevel(expression, ',')
    .map(scalar)
    .filter((value): value is string => value !== undefined);
  return variables.length === 1 ? { [variables[0]]: values } : {};
}

function loopContexts(source: string): LoopContext[] {
  const contexts: LoopContext[] = [];
  const loopPattern = /@each\s+((?:\$[a-z0-9_-]+\s*,?\s*)+)in\s+/gi;
  for (const match of source.matchAll(loopPattern)) {
    const variables = [...match[1].matchAll(/\$[a-z0-9_-]+/gi)].map((item) => item[0]);
    const headerStart = (match.index ?? 0) + match[0].length;
    const opening = source.indexOf('{', headerStart);
    if (opening === -1) continue;
    const closing = matchingBrace(source, opening);
    if (closing === -1) continue;
    contexts.push({
      start: match.index ?? 0,
      end: closing + 1,
      values: parseLoopValues(source.slice(headerStart, opening), variables),
    });
  }
  return contexts;
}

function mixinContexts(source: string, loops: readonly LoopContext[]): MixinContext[] {
  const contexts: MixinContext[] = [];
  const mixinPattern = /@mixin\s+([a-z0-9_-]+)\s*\(([^)]*)\)\s*\{/gi;
  for (const match of source.matchAll(mixinPattern)) {
    const opening = (match.index ?? 0) + match[0].length - 1;
    const closing = matchingBrace(source, opening);
    if (closing === -1) continue;
    const parameters = [...match[2].matchAll(/\$[a-z0-9_-]+/gi)].map((item) => item[0]);
    const name = match[1];
    const invocations: Readonly<Record<string, string>>[] = [];
    const invocationPattern = new RegExp(`@include\\s+${name}\\s*\\(([^)]*)\\)`, 'gi');
    for (const invocation of source.matchAll(invocationPattern)) {
      const args = splitTopLevel(invocation[1], ',');
      const values: Record<string, string> = {};
      parameters.forEach((parameter, index) => {
        const argument = args[index]?.trim();
        if (!argument) return;
        if (argument.startsWith('$')) {
          const containingLoop = loops
            .filter((loop) => (invocation.index ?? 0) >= loop.start && (invocation.index ?? 0) < loop.end)
            .toSorted((left, right) => right.start - left.start)[0];
          const loopValues = containingLoop?.values[argument];
          if (loopValues?.length === 1) values[parameter] = loopValues[0];
        } else {
          const value = scalar(argument);
          if (value) values[parameter] = value;
        }
      });
      if (Object.keys(values).length === parameters.length) invocations.push(values);
    }
    contexts.push({ start: match.index ?? 0, end: closing + 1, name, parameters, invocations });
  }
  return contexts;
}

function propertyFallback(source: string, tokenStart: number): string | undefined {
  const before = source.slice(0, tokenStart);
  const varStart = before.lastIndexOf('var(');
  if (varStart === -1 || /[^\s]$/.test(before.slice(varStart + 4))) return undefined;
  const opening = varStart + 3;
  const closing = matchingParenthesis(source, opening);
  if (closing === -1) return undefined;
  const argumentsList = splitTopLevel(source.slice(opening + 1, closing), ',');
  return argumentsList[1];
}

function matchingParenthesis(source: string, opening: number): number {
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === '(') depth += 1;
    else if (source[index] === ')' && --depth === 0) return index;
  }
  return -1;
}

function expandToken(token: string | undefined, values: Readonly<Record<string, string>>): string | undefined {
  if (token === undefined) return undefined;
  const unresolved = [...token.matchAll(/#\{(\$[a-z0-9_-]+)\}/gi)];
  let expanded = token;
  for (const match of unresolved) {
    const value = values[match[1]];
    if (!value) return undefined;
    expanded = expanded.replace(match[0], value);
  }
  return expanded.replace(/-+$/, '');
}

function contextValues(context: LoopContext | MixinContext | undefined): Readonly<Record<string, string>>[] {
  if (!context) return [{}];
  if ('invocations' in context) return context.invocations;
  const entries = Object.entries(context.values);
  if (entries.length === 0) return [{}];
  return entries[0][1].map((_, index) =>
    Object.fromEntries(entries.map(([key, values]) => [key, values[index] ?? values[0]])),
  );
}

function extractUsages(source: string): { usages: ExtractedUsage[]; unresolved: string[] } {
  const cleanSource = withoutPropertyDeclarations(withoutComments(source));
  const loops = loopContexts(cleanSource);
  const mixins = mixinContexts(cleanSource, loops);
  const usages: ExtractedUsage[] = [];
  const unresolved: string[] = [];
  for (const match of cleanSource.matchAll(propertyPattern)) {
    const token = match[0].replace(/-+(?=#)/g, '-');
    const index = match.index ?? 0;
    const mixin = mixins
      .filter((context) => index >= context.start && index < context.end)
      .sort((a, b) => b.start - a.start)[0];
    const loop = loops
      .filter((context) => index >= context.start && index < context.end)
      .sort((a, b) => b.start - a.start)[0];
    const contexts = mixin ? contextValues(mixin) : contextValues(loop);
    if (token.includes('#{')) {
      const expanded = contexts
        .map((values) => expandToken(token, values))
        .filter((value): value is string => value !== undefined);
      if (expanded.length === 0) unresolved.push(token);
      for (const property of new Set(expanded)) {
        const valuesForProperty = contexts.find((values) => expandToken(token, values) === property) ?? {};
        usages.push({
          property,
          fallback: expandToken(propertyFallback(cleanSource, index), valuesForProperty),
          unresolved: false,
        });
      }
    } else {
      usages.push({
        property: token.replace(/-+$/, ''),
        fallback: propertyFallback(cleanSource, index),
        unresolved: false,
      });
    }
  }
  return { usages, unresolved };
}

export function extractComponentPropertyUsages(source: string): readonly ComponentPropertyUsage[] {
  const { usages } = extractUsages(source);
  return [...new Map(usages.map((usage) => [usage.property, usage])).values()].map((usage) => ({
    property: usage.property,
    ...(usage.fallback === undefined ? {} : { fallback: usage.fallback }),
    syntax: '*',
    inherits: true,
  }));
}

function registrationNames(source: string): string[] {
  return [...withoutComments(source).matchAll(declarationPattern)].map((match) => match[1]);
}

function importedSources(
  modulePath: string,
  source: string,
  sources: Map<string, SourceFile>,
  visited = new Set<string>(),
): SourceFile[] {
  const result: SourceFile[] = [];
  for (const match of withoutComments(source).matchAll(usePattern)) {
    const base = resolve(dirname(modulePath), match[2]);
    const candidates = [
      `${base}.scss`,
      `${dirname(base)}/_${base.split('/').pop() ?? ''}.scss`,
      `${base}/_index.scss`,
      `${base}/index.scss`,
    ];
    const imported = candidates.map((candidate) => sources.get(candidate)).find((candidate) => candidate !== undefined);
    if (!imported || visited.has(imported.path)) continue;
    visited.add(imported.path);
    result.push(imported, ...importedSources(imported.path, imported.source, sources, visited));
  }
  return result;
}

export function validateComponentStylesheet(
  modulePath: string,
  moduleSource: string,
  imported: ReadonlyMap<string, string> = new Map(),
): readonly DeclarationIssue[] {
  const { usages, unresolved } = extractUsages(moduleSource);
  const sources = new Map<string, SourceFile>([
    [resolve(modulePath), { path: resolve(modulePath), source: moduleSource }],
  ]);
  for (const [path, source] of imported) sources.set(resolve(path), { path: resolve(path), source });
  const registrationSources = importedSources(resolve(modulePath), moduleSource, sources);
  const registrationSourceList = [{ path: resolve(modulePath), source: moduleSource }, ...registrationSources];
  const usageNames = new Set(usages.map((usage) => usage.property));
  const declarations = registrationSourceList.flatMap((file) =>
    registrationNames(file.source).map((property) => ({ ...file, property })),
  );
  const issues: DeclarationIssue[] = [];
  for (const property of unresolved) {
    issues.push({
      kind: 'unresolved',
      modulePath,
      property,
      message: `${modulePath}: unresolved interpolated property ${property}`,
    });
  }
  for (const property of usageNames) {
    const matches = declarations.filter((declaration) => declaration.property === property);
    if (matches.length === 0)
      issues.push({
        kind: 'missing',
        modulePath,
        property,
        message: `${modulePath}: missing @property registration for ${property}`,
      });
    if (matches.length > 1)
      issues.push({
        kind: 'duplicate',
        modulePath,
        property,
        message: `${modulePath}: duplicate @property registrations for ${property}`,
      });
  }
  for (const declaration of declarations) {
    if (!declaration.property.includes('#{') && !usageNames.has(declaration.property)) {
      issues.push({
        kind: 'orphaned',
        modulePath,
        property: declaration.property,
        message: `${modulePath}: orphaned @property registration for ${declaration.property}`,
      });
    }
    if (declaration.property.includes('#{')) {
      issues.push({
        kind: 'unresolved',
        modulePath,
        property: declaration.property,
        message: `${modulePath}: unresolved interpolated registration ${declaration.property}`,
      });
    }
  }
  return issues;
}

function componentModules(root: string): string[] {
  const modules: string[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['.cache', 'dist', 'node_modules'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith('.module.scss') && path.includes('/src/components/'))
        modules.push(path);
    }
  }
  visit(resolve(root, 'packages'));
  return modules.sort();
}

export function validateComponentPropertyDeclarations(root: string): DeclarationValidationReport {
  const modules = componentModules(root);
  const allScss = new Map<string, SourceFile>();
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['.cache', 'dist', 'node_modules'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith('.scss'))
        allScss.set(path, { path, source: readFileSync(path, 'utf8') });
    }
  }
  visit(resolve(root, 'packages'));
  const issues: DeclarationIssue[] = [];
  let forgeModules = 0;
  let usages = 0;
  let registrations = 0;
  for (const modulePath of modules) {
    const source = allScss.get(modulePath)?.source ?? readFileSync(modulePath, 'utf8');
    const extracted = extractComponentPropertyUsages(source);
    if (extracted.length === 0) continue;
    forgeModules += 1;
    usages += extracted.length;
    const imported = new Map<string, string>([...allScss.values()].map((file) => [file.path, file.source]));
    const moduleIssues = validateComponentStylesheet(modulePath, source, imported);
    registrations += moduleIssues.length === 0 ? new Set(registrationNames(source)).size : 0;
    issues.push(...moduleIssues);
  }
  return { modules: modules.length, forgeModules, usages, registrations, issues };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const report = validateComponentPropertyDeclarations(root);
  console.log(
    `Scanned ${report.modules} component modules; ${report.forgeModules} use component-prefixed properties; ${report.usages} concrete usages.`,
  );
  if (report.issues.length > 0) {
    for (const issue of report.issues) console.error(`${issue.kind}: ${issue.message}`);
    process.exitCode = 1;
  } else console.log('All component-prefixed properties have exactly one local registration.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
