import { stableStringify } from "./corpus.ts";

import type { BenchmarkOutput } from "./contracts.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeUtf8(value: string): Uint8Array {
  return encoder.encode(value);
}

export function decodeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function normalizeBenchmarkOutput(value: unknown): BenchmarkOutput {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Benchmark adapter returned a non-finite number.");
    }
    return value;
  }
  if (typeof value === "string") return value;
  throw new Error(
    "Benchmark adapter returned a value outside the normalized output contract.",
  );
}

export function outputsEqual(
  left: BenchmarkOutput,
  right: BenchmarkOutput,
): boolean {
  return stableStringify(left) === stableStringify(right);
}

export function hashArtifactBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function validateWasmArtifact(
  bytes: Uint8Array,
  requiredExports: readonly string[],
): readonly string[] {
  const source = bytes as unknown as BufferSource;
  if (!WebAssembly.validate(source))
    throw new Error("Generated artifact is not valid WebAssembly.");
  const module = new WebAssembly.Module(source);
  const exports = WebAssembly.Module.exports(module)
    .map(({ name }) => name)
    .toSorted();
  for (const required of requiredExports) {
    if (!exports.includes(required))
      throw new Error(
        `WASM artifact is missing required export '${required}'.`,
      );
  }
  return exports;
}

export function validateManifestExports(
  manifest: unknown,
  requiredExports: readonly string[],
): readonly string[] {
  if (manifest === null || typeof manifest !== "object")
    throw new Error("Artifact manifest is not an object.");
  const exports = (manifest as { exports?: unknown }).exports;
  if (
    !Array.isArray(exports) ||
    !exports.every((entry) => entry !== null && typeof entry === "object")
  ) {
    throw new Error("Artifact manifest has no valid exports list.");
  }
  const names = exports
    .map((entry) => (entry as { name?: unknown }).name)
    .filter((name): name is string => typeof name === "string")
    .toSorted();
  for (const required of requiredExports) {
    if (!names.includes(required))
      throw new Error(
        `Artifact manifest is missing required export '${required}'.`,
      );
  }
  return names;
}

/** Write bytes into guest memory using the real fws_alloc export when present. */
export function writeGuestBytes(
  memory: WebAssembly.Memory,
  alloc: ((size: number) => number) | undefined,
  bytes: Uint8Array,
  fallbackPointer = 1024,
): { pointer: number; length: number } {
  const length = bytes.byteLength;
  const pointer =
    alloc === undefined ? fallbackPointer : alloc(length === 0 ? 1 : length);
  const required = pointer + Math.max(length, 1);
  if (required > memory.buffer.byteLength) {
    memory.grow(Math.ceil((required - memory.buffer.byteLength) / 65_536));
  }
  if (length > 0) {
    new Uint8Array(memory.buffer, pointer, length).set(bytes);
  }
  return { pointer, length };
}

export function readGuestBytes(
  memory: WebAssembly.Memory,
  pointer: number,
  length: number,
): Uint8Array {
  return new Uint8Array(memory.buffer, pointer, length).slice();
}
