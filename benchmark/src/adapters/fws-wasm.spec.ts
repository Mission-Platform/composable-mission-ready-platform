import { describe, expect, it } from "vitest";

import { BENCHMARK_CORPUS } from "../corpus.ts";

import {
  createFwsExcludedBoundsWasmAdapter,
  createFwsGeneratedWasmAdapter,
  createFwsWasmAdapter,
} from "./fws-wasm.ts";

import type { StringInput } from "../contracts.ts";

const stringCase = BENCHMARK_CORPUS.find(
  (benchmarkCase) =>
    benchmarkCase.category === "string" && benchmarkCase.fixture === "unicode",
);

if (stringCase === undefined)
  throw new Error("Unicode string benchmark case is missing.");

describe("FWS generated ESM benchmark adapter", () => {
  it("labels the two-stage pipeline and its explicit bounds-policy comparison", async () => {
    const checked = await createFwsWasmAdapter().build();
    const excluded = await createFwsExcludedBoundsWasmAdapter().build();

    expect(checked.fwsPipeline).toMatchObject({
      pipeline: "fws-son-wasm-two-stage",
      frontend: "son-ir",
      wasmStage: "wasm-ir-optimizer",
      optimization: "release",
      boundsChecks: "runtime",
    });
    expect(excluded.fwsPipeline).toMatchObject({
      pipeline: "fws-son-wasm-two-stage",
      boundsChecks: "excluded-by-profile",
    });
    expect(excluded.fwsMode).toBe("wasm-excluded-bounds");
    expect(excluded.hash).not.toBe(checked.hash);
  }, 120_000);

  it("matches the raw ABI baseline and records boundary costs", async () => {
    const raw = createFwsWasmAdapter();
    const generated = createFwsGeneratedWasmAdapter();
    const rawArtifact = await raw.build();
    const generatedArtifact = await generated.build();
    const repeatedGeneratedArtifact =
      await createFwsGeneratedWasmAdapter().build();

    expect(generatedArtifact.hash).toBe(rawArtifact.hash);
    expect(repeatedGeneratedArtifact.hash).toBe(generatedArtifact.hash);
    const generatedSourceHash = generatedArtifact.metadata?.generatedSourceHash;
    expect(generatedSourceHash).toMatch(/^[0-9a-f]{8}$/);
    expect(repeatedGeneratedArtifact.metadata?.generatedSourceHash).toBe(
      generatedSourceHash,
    );
    expect(generatedArtifact.sizeBytes).toBe(rawArtifact.sizeBytes);
    expect(generatedArtifact.metadata).toMatchObject({
      rawWasmBytes: rawArtifact.sizeBytes,
      stringInputAllocations: 1,
      stringOutputAllocations: 1,
    });
    expect(rawArtifact.metadata).toMatchObject({
      rawWasmBytes: rawArtifact.sizeBytes,
      stringInputAllocations: 3,
      stringOutputAllocations: 1,
    });
    expect(generatedArtifact.metadata?.generatedSourceBytes).toBeGreaterThan(0);

    const rawInitialized = await raw.initialize(rawArtifact);
    const generatedInitialized = await generated.initialize(generatedArtifact);
    expect(await rawInitialized.execute(stringCase.input)).toBe(
      stringCase.expected,
    );
    expect(await generatedInitialized.execute(stringCase.input)).toBe(
      stringCase.expected,
    );
  }, 120_000);

  it("keeps load and loadSync behavior equivalent", async () => {
    const adapter = createFwsGeneratedWasmAdapter();
    const artifact = await adapter.build();
    const moduleUrl = artifact.metadata?.moduleUrl;
    if (typeof moduleUrl !== "string")
      throw new Error("Generated module URL is missing.");
    const loaded = (await import(`${moduleUrl}?loader-test`)) as {
      load: () => Promise<{
        string_transform: (
          value: string,
          prefix: string,
          suffix: string,
          repeat: number,
        ) => string;
      }>;
      loadSync: () => {
        string_transform: (
          value: string,
          prefix: string,
          suffix: string,
          repeat: number,
        ) => string;
      };
    };
    const input = stringCase.input as StringInput;
    const sync = loaded
      .loadSync()
      .string_transform(input.value, input.prefix, input.suffix, input.repeat);
    const asynchronousExports = await loaded.load();
    const asynchronous = asynchronousExports.string_transform(
      input.value,
      input.prefix,
      input.suffix,
      input.repeat,
    );
    expect(sync).toBe(stringCase.expected);
    expect(asynchronous).toBe(sync);
  }, 120_000);
});
