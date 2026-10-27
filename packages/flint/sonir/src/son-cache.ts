import { validateFlintSonIrSchema } from "./schema.js";
import { flintSoNGraphHash, type FlintSoNModule } from "./son-ir.js";

/**
 * Maximum permitted size in bytes for a serialized Flint SoN JSON payload (16 MiB).
 */
export const FLINT_SON_MAX_JSON_BYTES = 16 * 1024 * 1024;

/**
 * Checks whether an unknown value is a non-null object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Recursively orders object keys lexicographically to produce stable JSON serializations.
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
    | "compilerVersion"
    | "languageVersion"
    | "abiVersion"
    | "sourceHash"
    | "graphHash"
    | "optimization"
    | "boundsChecks"
    | "memoryModel"
  >
>;

/**
 * Deserializes and validates a JSON string into a FlintSoNModule.
 */
export function deserializeFlintSoN(
  json: string,
  expectedIdentity?: FlintSoNIdentity,
): FlintSoNModule {
  if (new TextEncoder().encode(json).length > FLINT_SON_MAX_JSON_BYTES) {
    throw new Error(
      `Serialized SoN JSON exceeds maximum allowed size of ${FLINT_SON_MAX_JSON_BYTES} bytes`,
    );
  }
  const parsed: unknown = JSON.parse(json);
  const validation = validateFlintSonIrSchema(parsed);
  if (!validation.valid) {
    throw new Error(
      `Invalid Flint SoN schema: ${validation.errors.join("; ")}`,
    );
  }
  const module = parsed as FlintSoNModule;

  if (expectedIdentity !== undefined) {
    for (const [key, value] of Object.entries(expectedIdentity)) {
      if (
        value !== undefined &&
        module[key as keyof FlintSoNModule] !== value
      ) {
        throw new Error(
          `Mismatched SoN identity property '${key}': expected '${String(value)}', got '${String(module[key as keyof FlintSoNModule])}'`,
        );
      }
    }
  }

  const computedHash = flintSoNGraphHash(module);
  if (module.graphHash !== computedHash) {
    throw new Error(
      `Invalid SoN graph hash: expected '${computedHash}', got '${module.graphHash}'`,
    );
  }

  return module;
}
