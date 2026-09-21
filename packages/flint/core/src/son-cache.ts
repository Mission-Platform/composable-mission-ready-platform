import { flintSoNGraphHash } from './son-ir.js';

import type { FlintSoNModule } from './son-ir.js';

/**
 * Maximum permitted size in bytes for a serialized Flint SoN JSON payload (16 MiB).
 */
export const FLINT_SON_MAX_JSON_BYTES = 16 * 1024 * 1024;

/**
 * Checks whether an unknown value is a non-null object record.
 *
 * @param value - Candidate value.
 * @returns True if value is an object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Recursively orders object keys lexicographically to produce stable JSON serializations.
 *
 * @param value - Arbitrary JSON-compatible value to normalize.
 * @returns Deterministically sorted copy of the value.
 */
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

/**
 * Serializes a Flint Sea-of-Nodes module into deterministic, indented JSON.
 *
 * @param module - Sea-of-Nodes module to serialize.
 * @returns Canonical JSON string terminated with a newline.
 */
export function serializeFlintSoN(module: FlintSoNModule): string {
  return `${JSON.stringify(stableValue(module), undefined, 2)}\n`;
}

/**
 * Identity criteria used to verify a deserialized Sea-of-Nodes artifact against expected compiler and graph attributes.
 */
export type FlintSoNIdentity = Partial<
  Pick<
    FlintSoNModule,
    | 'compilerVersion'
    | 'languageVersion'
    | 'abiVersion'
    | 'sourceHash'
    | 'graphHash'
    | 'optimization'
    | 'boundsChecks'
    | 'memoryModel'
  >
>;

/**
 * Validates that an optimization level string is supported.
 *
 * @param value - Candidate optimization value.
 * @returns True if value is a valid optimization level.
 */
function isValidOptimization(value: unknown): value is 'debug' | 'release' {
  return value === 'debug' || value === 'release';
}

/**
 * Validates that a bounds checking mode string is supported.
 *
 * @param value - Candidate bounds checking mode.
 * @returns True if value is a valid bounds check mode.
 */
function isValidBoundsChecks(value: unknown): value is FlintSoNModule['boundsChecks'] {
  return value === 'runtime' || value === 'proven-safe' || value === 'excluded-by-profile';
}

/**
 * Validates the scalar header and metadata fields of a candidate Sea-of-Nodes module.
 *
 * @param candidate - Candidate module record.
 * @returns True if all header fields conform to specification.
 */
// skipcq: JS-R1005
function validateModuleHeader(candidate: Record<string, unknown>): boolean {
  if (
    candidate.schemaVersion !== '1.0' ||
    typeof candidate.compilerVersion !== 'string' ||
    typeof candidate.languageVersion !== 'string' ||
    typeof candidate.abiVersion !== 'string' ||
    typeof candidate.sourceHash !== 'string' ||
    typeof candidate.graphHash !== 'string'
  ) {
    return false;
  }
  return (
    isValidOptimization(candidate.optimization) &&
    isValidBoundsChecks(candidate.boundsChecks) &&
    candidate.memoryModel === 'region-arc-checked-linear'
  );
}

/**
 * Validates that primary module collections are arrays within allowable size limits.
 *
 * @param candidate - Candidate module record.
 * @returns True if all array properties exist and adhere to length caps.
 */
// skipcq: JS-R1005
function validateModuleArrayLengths(candidate: Record<string, unknown>): boolean {
  if (
    !Array.isArray(candidate.nodes) ||
    !Array.isArray(candidate.functions) ||
    !Array.isArray(candidate.regions) ||
    !Array.isArray(candidate.sourceMap)
  ) {
    return false;
  }
  return (
    candidate.nodes.length <= 1_000_000 &&
    candidate.functions.length <= 100_000 &&
    candidate.regions.length <= 1_000_000
  );
}

/**
 * Structural shape of a Sea-of-Nodes node before full graph validation.
 */
interface ValidNodeShape {
  readonly id: number;
  readonly kind: string;
  readonly functionName: string;
  readonly inputs: readonly unknown[];
  readonly effects: readonly unknown[];
  readonly alias: unknown;
  readonly ownership: unknown;
}

/**
 * Validates the structural fields and types of an individual Sea-of-Nodes node.
 *
 * @param node - Candidate node item.
 * @returns True if node conforms to structural layout.
 */
// skipcq: JS-R1005
function isNodeShapeValid(node: unknown): node is ValidNodeShape {
  if (!isRecord(node)) return false;
  return (
    typeof node.id === 'number' &&
    typeof node.kind === 'string' &&
    typeof node.functionName === 'string' &&
    Array.isArray(node.inputs) &&
    Array.isArray(node.effects) &&
    node.alias !== undefined &&
    node.ownership !== undefined
  );
}

/**
 * Validates that all node inputs are valid integers referencing known node identifiers.
 *
 * @param inputs - Input identifier list.
 * @param knownIds - Set of recognized node identifiers.
 * @returns True if every input is an integer present in knownIds.
 */
function areNodeInputsValid(inputs: readonly unknown[], knownIds: ReadonlySet<number>): boolean {
  return inputs.every((input) => typeof input === 'number' && Number.isInteger(input) && knownIds.has(input));
}

/**
 * Validates sequential ordering, input bindings, and node schemas across the module node array.
 *
 * @param nodes - Node collection from candidate module.
 * @param knownIds - Set of allowable node identifiers.
 * @returns True if all nodes are valid and indexed sequentially.
 */
function validateNodes(nodes: readonly unknown[], knownIds: ReadonlySet<number>): boolean {
  for (const [index, node] of nodes.entries()) {
    if (!isNodeShapeValid(node)) return false;
    if (node.id !== index + 1) return false;
    if (!areNodeInputsValid(node.inputs, knownIds)) return false;
  }
  return true;
}

/**
 * Validates an individual function entry declaration within the Sea-of-Nodes module.
 *
 * @param entry - Candidate function entry.
 * @param knownIds - Set of known node identifiers for verifying entry node references.
 * @returns True if function entry is structurally valid and entry point exists.
 */
function isFunctionEntryValid(entry: unknown, knownIds: ReadonlySet<number>): boolean {
  if (!isRecord(entry)) return false;
  return typeof entry.name === 'string' && typeof entry.entry === 'number' && knownIds.has(entry.entry);
}

/**
 * Validates all function definitions within the candidate module.
 *
 * @param functions - Function entry collection.
 * @param knownIds - Set of known node identifiers.
 * @returns True if all function entries are valid.
 */
function validateFunctions(functions: readonly unknown[], knownIds: ReadonlySet<number>): boolean {
  return functions.every((entry) => isFunctionEntryValid(entry, knownIds));
}

/**
 * Validates the node and function collections within a candidate module record.
 *
 * @param candidate - Candidate module record.
 * @returns True if both nodes and functions are structurally sound and internally consistent.
 */
function validateCandidateCollections(candidate: Record<string, unknown>): boolean {
  const nodes = candidate.nodes;
  if (!Array.isArray(nodes)) return false;
  const knownIds = new Set<number>();
  for (const [index] of nodes.entries()) {
    knownIds.add(index + 1);
  }
  if (!validateNodes(nodes, knownIds)) return false;
  return Array.isArray(candidate.functions) && validateFunctions(candidate.functions, knownIds);
}

/**
 * Validates that candidate module metadata matches expected identity attributes.
 *
 * @param candidate - Candidate module record.
 * @param expected - Expected identity constraints.
 * @returns True if all provided expected attributes match the candidate.
 */
function matchesExpectedIdentity(candidate: Record<string, unknown>, expected?: FlintSoNIdentity): boolean {
  if (!expected) return true;
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (expectedValue !== undefined && candidate[key] !== expectedValue) {
      return false;
    }
  }
  return true;
}

/**
 * Re-asserts validated record value as a FlintSoNModule.
 *
 * @param value - Structurally validated candidate value.
 * @returns Type predicate asserting value conforms to FlintSoNModule.
 */
function assertSoNModule(value: unknown): value is FlintSoNModule {
  return typeof value === 'object' && value !== null;
}

/**
 * Validates that an arbitrary JSON-deserialized object conforms to the Sea-of-Nodes module contract.
 *
 * @param value - Untrusted value to validate.
 * @param expected - Optional identity parameters to enforce.
 * @returns True if value is a valid FlintSoNModule satisfying all constraints.
 */
// skipcq: JS-R1005
export function validateFlintSoN(value: unknown, expected?: FlintSoNIdentity): value is FlintSoNModule {
  try {
    if (!isRecord(value)) return false;
    if (!validateModuleHeader(value) || !validateModuleArrayLengths(value)) {
      return false;
    }
    if (!validateCandidateCollections(value) || !matchesExpectedIdentity(value, expected)) {
      return false;
    }
    if (!assertSoNModule(value)) {
      return false;
    }

    return flintSoNGraphHash(value) === value.graphHash;
  } catch {
    return false;
  }
}

/**
 * Deserializes and validates a JSON string representing a Flint Sea-of-Nodes module.
 *
 * @param contents - Raw JSON string content.
 * @param expected - Optional expected module identity attributes.
 * @returns Validated FlintSoNModule, or undefined if invalid or exceeding size limits.
 */
export function deserializeFlintSoN(contents: string, expected?: FlintSoNIdentity): FlintSoNModule | undefined {
  try {
    if (contents.length > FLINT_SON_MAX_JSON_BYTES) return undefined;
    const value: unknown = JSON.parse(contents);
    return validateFlintSoN(value, expected) ? value : undefined;
  } catch {
    return undefined;
  }
}
