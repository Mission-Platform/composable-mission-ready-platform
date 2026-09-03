import {
  FORGE_WEB_SCRIPT_REGEX_FUNCTIONS,
  FORGE_WEB_SCRIPT_STRING_FUNCTIONS,
  primitiveTypes,
} from '@mission-platform/forge-web-script';

import { offsetAtPosition, rangeFromOffsets } from './positions.js';

import type {
  ForgeWebScriptCompletion,
  ForgeWebScriptPosition,
  ForgeWebScriptSymbol,
  ForgeWebScriptWorkspaceOptions,
} from './types.js';

const keywords = [
  'as',
  'capability',
  'case',
  'do',
  'else',
  'enum',
  'export',
  'fn',
  'if',
  'import',
  'interface',
  'let',
  'match',
  'return',
  'struct',
  'iter',
  'loop',
  'while',
  'yield',
  'inline',
  'noinline',
  'likely',
  'unlikely',
];

const outcomeTypes = ['Iterable', 'Iterator', 'Option', 'Result', 'iterResult'];

export function completeForgeWebScript(
  source: string,
  position: ForgeWebScriptPosition,
  symbols: readonly ForgeWebScriptSymbol[],
  options: ForgeWebScriptWorkspaceOptions,
): readonly ForgeWebScriptCompletion[] {
  const offset = offsetAtPosition(source, position);
  const prefixMatch = /[A-Za-z_][A-Za-z0-9_]*$/u.exec(source.slice(0, offset));
  const prefix = prefixMatch?.[0] ?? '';
  const start = offset - prefix.length;
  const range = rangeFromOffsets(source, start, offset);
  const items = new Map<string, ForgeWebScriptCompletion>();
  const add = (item: Omit<ForgeWebScriptCompletion, 'range'>): void => {
    if (!item.label.startsWith(prefix)) return;
    items.set(item.label, { ...item, range });
  };
  for (const keyword of keywords) add({ label: keyword, kind: 'keyword', detail: 'Forge Web Script keyword' });
  for (const type of primitiveTypes) add({ label: type, kind: 'type', detail: 'Forge Web Script v1 primitive type' });
  for (const type of outcomeTypes)
    add({ label: type, kind: 'type', detail: 'Forge Web Script v1 generic outcome type' });
  for (const declaration of FORGE_WEB_SCRIPT_STRING_FUNCTIONS)
    add({
      label: declaration.name,
      kind: 'function',
      detail: callableDetail(declaration.name, declaration.parameters, declaration.result),
    });
  for (const declaration of FORGE_WEB_SCRIPT_REGEX_FUNCTIONS)
    add({
      label: declaration.name,
      kind: 'function',
      detail: callableDetail(declaration.name, declaration.parameters, declaration.result),
    });
  for (const symbol of visibleSymbols(symbols, offset)) {
    const kind =
      symbol.kind === 'function'
        ? 'function'
        : symbol.kind === 'capability'
          ? 'capability'
          : symbol.kind === 'type'
            ? 'type'
            : 'declaration';
    add({ label: symbol.name, kind, detail: symbol.detail, documentation: symbol.callable?.documentation });
  }
  const capabilityNames = new Set([
    ...(options.capabilityNames ?? []),
    ...(options.requestedCapabilities ?? []),
    ...(options.capabilitySignatures?.keys() ?? []),
  ]);
  for (const capability of capabilityNames) {
    const signature = options.capabilitySignatures?.get(capability);
    add({
      label: capability,
      kind: 'capability',
      detail:
        signature === undefined
          ? 'workspace capability'
          : `capability (${signature.parameters.join(', ')}): ${signature.result}`,
      documentation: signature?.documentation,
    });
  }
  return [...items.values()].toSorted((left, right) => left.label.localeCompare(right.label));
}

function callableDetail(name: string, parameters: readonly string[], result: string): string {
  return `${name}(${parameters.join(', ')}): ${result}`;
}

function visibleSymbols(symbols: readonly ForgeWebScriptSymbol[], offset: number): readonly ForgeWebScriptSymbol[] {
  const functionAtCursor = symbols.find(
    (symbol) =>
      symbol.kind === 'function' &&
      symbol.scopeRange !== undefined &&
      symbol.scopeRange.startOffset <= offset &&
      symbol.scopeRange.endOffset >= offset,
  )?.name;

  const isInScope = (symbol: ForgeWebScriptSymbol): boolean => {
    if (symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type') return true;
    if (symbol.scopeRange === undefined) return true;
    return symbol.scopeRange.startOffset <= offset && symbol.scopeRange.endOffset >= offset;
  };

  return symbols.filter(
    (symbol) =>
      isInScope(symbol) &&
      ((symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type') ||
        symbol.range.startOffset <= offset) &&
      (symbol.containerName === undefined ||
        symbol.containerName === functionAtCursor ||
        (symbol.kind !== 'local' && symbol.kind !== 'parameter' && symbol.kind !== 'type')),
  );
}
