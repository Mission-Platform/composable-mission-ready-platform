import { describe, expect, it } from "vitest";

import { createBenchmarkKey, type BenchmarkKey } from "./contracts.ts";

describe("benchmark contracts", () => {
  it("creates stable keys with an explicit FWS mode slot", () => {
    const key: BenchmarkKey = {
      caseId: "arithmetic:standard:small",
      workload: "arithmetic",
      inputSize: "small",
      implementation: "fws",
      fwsMode: "jit",
      hostRuntime: "node",
      phase: "execute",
    };

    expect(createBenchmarkKey(key)).toBe(
      "arithmetic:standard:small|arithmetic|small|fws|jit|node|execute",
    );
    expect(createBenchmarkKey({ ...key, fwsMode: undefined })).toBe(
      "arithmetic:standard:small|arithmetic|small|fws|-|node|execute",
    );
  });

  it("keeps implementation and phase values closed over the report contract", () => {
    const key: BenchmarkKey = {
      caseId: "dataset:standard:large",
      workload: "dataset",
      inputSize: "large",
      implementation: "rust-wasm",
      hostRuntime: "chromium",
      phase: "build",
    };

    expect(createBenchmarkKey(key).split("|").slice(-3)).toEqual([
      "-",
      "chromium",
      "build",
    ]);
  });
});
