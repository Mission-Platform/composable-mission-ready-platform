import { describe, expect, it } from "vitest";

import {
  BENCHMARK_CORPUS,
  BENCHMARK_CORPUS_HASH,
  corpusHash,
  createBenchmarkCorpus,
  stableHash,
  stableStringify,
} from "./corpus.ts";
import { runArithmetic, runDataset, runString } from "./kernels.ts";

describe("benchmark corpus", () => {
  it("has all workload families and all configured sizes in deterministic order", () => {
    const cases = createBenchmarkCorpus();

    expect(cases).toHaveLength(14);
    expect(
      new Set(cases.map((benchmarkCase) => benchmarkCase.category)),
    ).toEqual(new Set(["arithmetic", "string", "dataset"]));
    expect(new Set(cases.map((benchmarkCase) => benchmarkCase.size))).toEqual(
      new Set(["small", "medium", "large"]),
    );
    expect(cases.map((benchmarkCase) => benchmarkCase.id)).toEqual([
      "arithmetic:standard:small",
      "arithmetic:empty:small",
      "arithmetic:singleton:small",
      "string:unicode:small",
      "string:empty:small",
      "dataset:standard:small",
      "dataset:empty:small",
      "dataset:singleton:small",
      "arithmetic:standard:medium",
      "string:standard:medium",
      "dataset:standard:medium",
      "arithmetic:standard:large",
      "string:standard:large",
      "dataset:standard:large",
    ]);
  });

  it("retains golden outputs and stable hashes across regeneration", () => {
    const regenerated = createBenchmarkCorpus();

    expect(corpusHash(regenerated)).toBe(BENCHMARK_CORPUS_HASH);
    expect(regenerated).toEqual(BENCHMARK_CORPUS);
    expect(
      regenerated.every(
        (benchmarkCase) => benchmarkCase.fixtureHash.length === 16,
      ),
    ).toBe(true);

    const unicode = regenerated.find(
      (benchmarkCase) => benchmarkCase.id === "string:unicode:small",
    );
    expect(typeof unicode?.expected).toBe("string");
    expect(unicode?.expected).toContain("Δοκιμή");
    expect(unicode?.expected).not.toContain("ΔΟΚΙΜΉ");
  });

  it("keeps standard workloads large enough for measurable execution", () => {
    const standardCases = BENCHMARK_CORPUS.filter(
      (benchmarkCase) => benchmarkCase.fixture === "standard",
    );
    const arithmeticCounts = standardCases
      .filter((benchmarkCase) => benchmarkCase.category === "arithmetic")
      .map((benchmarkCase) => (benchmarkCase.input as { n: number }).n);
    const stringComplexities = standardCases
      .filter((benchmarkCase) => benchmarkCase.category === "string")
      .map((benchmarkCase) => {
        const input = benchmarkCase.input as { value: string; repeat: number };
        return [input.value.length, input.repeat];
      });
    const datasetCounts = standardCases
      .filter((benchmarkCase) => benchmarkCase.category === "dataset")
      .map(
        (benchmarkCase) =>
          (benchmarkCase.input as { bytes: readonly number[] }).bytes.length,
      );

    expect(arithmeticCounts).toEqual([16, 4096, 65_536]);
    expect(stringComplexities.at(-1)?.[0]).toBeGreaterThan(7000);
    expect(stringComplexities.map(([, repeat]) => repeat)).toEqual([2, 64]);
    expect(datasetCounts).toEqual([32, 8192, 16_384]);
  });

  it("includes boundary fixtures for empty and singleton inputs", () => {
    const emptyCases = BENCHMARK_CORPUS.filter(
      (benchmarkCase) => benchmarkCase.fixture === "empty",
    );
    const singletonCases = BENCHMARK_CORPUS.filter(
      (benchmarkCase) => benchmarkCase.fixture === "singleton",
    );

    expect(emptyCases.map((benchmarkCase) => benchmarkCase.category)).toEqual([
      "arithmetic",
      "string",
      "dataset",
    ]);
    expect(
      singletonCases.map((benchmarkCase) => benchmarkCase.category),
    ).toEqual(["arithmetic", "dataset"]);
    expect(
      emptyCases.every((benchmarkCase) => benchmarkCase.inputBytes > 0),
    ).toBe(true);
  });

  it("uses shared kernels for golden expected values", () => {
    for (const benchmarkCase of BENCHMARK_CORPUS) {
      if (benchmarkCase.category === "arithmetic") {
        expect(runArithmetic(benchmarkCase.input as never)).toBe(
          benchmarkCase.expected,
        );
      } else if (benchmarkCase.category === "string") {
        expect(runString(benchmarkCase.input as never)).toBe(
          benchmarkCase.expected,
        );
      } else {
        expect(runDataset(benchmarkCase.input as never)).toBe(
          benchmarkCase.expected,
        );
      }
    }
  });

  it("canonicalizes object key order before hashing", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(stableHash({ b: 2, a: 1 })).toBe(stableHash({ a: 1, b: 2 }));
  });
});
