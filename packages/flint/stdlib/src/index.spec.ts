import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createFlintVector,
  FLINT_STDLIB_IDENTITY,
  FLINT_STDLIB_SOURCE_ROOT,
  flintVectorGet,
  flintVectorPush,
} from ".";

const fwsRoot = fileURLToPath(new URL("../flint/", import.meta.url));

const expectedSources = {
  "async.flint": ["TaskKind", "Task", "MicrotaskScheduler", "WorkerScheduler"],
  "container.flint": ["Hash", "Equal"],
  "ecs.flint": ["Entity", "World", "empty_world"],
  "iterator.flint": [
    "Iterator",
    "LinearIterator",
    "RandomAccessIterator",
    "IteratorDescriptor",
    "IteratorCapability",
    "Mapper",
    "Predicate",
    "Folder",
    "ParallelStrategy",
    "ParallelOperation",
    "ParallelOperationDescriptor",
    "ParallelIterator",
    "par_map",
    "par_filter",
    "par_flatten",
    "par_collect",
    "par_to_array",
    "par_fold",
    "par_first",
    "par_last",
    "par_at",
    "to_array",
  ],
  "map.flint": [
    "Map",
    "empty_map",
    "map_length",
    "map_is_empty",
    "map_get",
    "map_has",
    "map_set",
    "map_delete",
    "map_keys",
    "map_values",
  ],
  "option.flint": ["Option", "is_some"],
  "result.flint": ["Result", "is_ok"],
  "set.flint": [
    "Set",
    "empty_set",
    "set_length",
    "set_is_empty",
    "set_has",
    "set_add",
    "set_delete",
    "set_values",
  ],
  "vector.flint": [
    "Vector",
    "empty",
    "with_capacity",
    "reserve",
    "length",
    "is_empty",
    "get",
    "set",
    "push",
    "pop",
    "iter",
    "to_array",
  ],
  "array.flint": [
    "Array",
    "array_new",
    "array_length",
    "array_get",
    "array_set",
  ],
} as const;

describe("Forge Web Script standard library", () => {
  it("publishes stable package identity and source-root metadata", () => {
    expect(FLINT_STDLIB_SOURCE_ROOT).toBe("flint");
    expect(FLINT_STDLIB_IDENTITY).toEqual({
      name: "@mission-platform/flint-stdlib",
      version: "0.1.0",
      representation: "hybrid-monomorphized-with-descriptor-boundaries",
    });
  });

  it("re-exports the runtime collection contracts through the stdlib entry point", () => {
    const original = createFlintVector([1]);
    const updated = flintVectorPush(original, 2);

    expect(original.values).toEqual([1]);
    expect(flintVectorGet(updated, 1)).toEqual({
      kind: "some",
      value: 2,
    });
  });

  it("ships every declared FWS standard-library source module", () => {
    expect(readdirSync(fwsRoot).toSorted()).toEqual(
      Object.keys(expectedSources).toSorted(),
    );

    for (const [fileName, declarations] of Object.entries(expectedSources)) {
      const source = readFileSync(`${fwsRoot}/${fileName}`, "utf8");

      for (const declaration of declarations) {
        expect(source).toContain(declaration);
      }
    }
  });
});
