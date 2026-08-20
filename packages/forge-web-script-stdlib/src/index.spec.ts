import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createForgeWebScriptVector,
  FORGE_WEB_SCRIPT_STDLIB_IDENTITY,
  FORGE_WEB_SCRIPT_STDLIB_SOURCE_ROOT,
  forgeWebScriptVectorGet,
  forgeWebScriptVectorPush,
} from ".";

const fwsRoot = fileURLToPath(new URL("../fws/", import.meta.url));

const expectedSources = {
  "async.fws": ["TaskKind", "Task", "MicrotaskScheduler", "WorkerScheduler"],
  "container.fws": ["Hash", "Equal"],
  "ecs.fws": ["Entity", "World", "empty_world"],
  "iterator.fws": [
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
  "map.fws": ["Map"],
  "option.fws": ["Option", "is_some"],
  "result.fws": ["Result", "is_ok"],
  "set.fws": ["Set"],
  "vector.fws": [
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
  "array.fws": ["Array", "array_new", "array_length", "array_get", "array_set"],
} as const;

describe("Forge Web Script standard library", () => {
  it("publishes stable package identity and source-root metadata", () => {
    expect(FORGE_WEB_SCRIPT_STDLIB_SOURCE_ROOT).toBe("fws");
    expect(FORGE_WEB_SCRIPT_STDLIB_IDENTITY).toEqual({
      name: "@mission-platform/forge-web-script-stdlib",
      version: "0.1.0",
      representation: "hybrid-monomorphized-with-descriptor-boundaries",
    });
  });

  it("re-exports the runtime collection contracts through the stdlib entry point", () => {
    const original = createForgeWebScriptVector([1]);
    const updated = forgeWebScriptVectorPush(original, 2);

    expect(original.values).toEqual([1]);
    expect(forgeWebScriptVectorGet(updated, 1)).toEqual({
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
