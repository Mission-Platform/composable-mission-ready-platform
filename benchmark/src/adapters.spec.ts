import { describe, expect, it } from "vitest";

import { validateWasmArtifact } from "./abi.ts";
import { createFwsVmAdapter } from "./adapters/fws-vm.ts";
import { createFwsWasmAdapter } from "./adapters/fws-wasm.ts";
import { createJavaScriptAdapter } from "./adapters/javascript.ts";
import { BENCHMARK_CORPUS } from "./corpus.ts";
import { runKernel } from "./kernels.ts";

import type { RuntimeAdapter } from "./contracts.ts";

async function expectCorpus(adapter: RuntimeAdapter, cases = BENCHMARK_CORPUS) {
  const artifact = await adapter.build();
  const initialized = await adapter.initialize(artifact);
  for (const benchmarkCase of cases) {
    const observed = await initialized.execute(benchmarkCase.input);
    expect(observed, benchmarkCase.id).toEqual(benchmarkCase.expected);
  }
  return initialized;
}

describe("benchmark runtime adapters", () => {
  it("keeps the JavaScript kernel as the golden reference", async () => {
    await expectCorpus(createJavaScriptAdapter());
    for (const benchmarkCase of BENCHMARK_CORPUS) {
      expect(runKernel(benchmarkCase.input)).toEqual(benchmarkCase.expected);
    }
  });

  it.each(["interpret", "jit", "aot"] as const)(
    "executes native FWS VM kernels independently (%s)",
    async (mode) => {
      const adapter = createFwsVmAdapter(mode);
      const artifact = await adapter.build();
      expect(artifact.metadata?.nativeKernels).toBe(true);
      const initialized = await adapter.initialize(artifact);
      expect(initialized.preparation?.aotArtifactCreated).toBe(mode === "aot");
      expect(initialized.preparation?.nativeKernels).toBe(true);
      expect(initialized.preparation?.backend).toBe(
        mode === "interpret" ? "interpreter" : "wasm",
      );
      expect(initialized.preparation?.instancePolicy).toBe(
        mode === "interpret" ? "fresh-per-execute" : "reusable-with-reset",
      );
      if (mode !== "interpret") {
        expect(initialized.preparation?.preparedArtifactHash).toBeTruthy();
        expect(initialized.preparation?.preparedArtifactSize).toBeGreaterThan(0);
      }
      for (const benchmarkCase of BENCHMARK_CORPUS) {
        const observed = await initialized.execute(benchmarkCase.input);
        expect(observed, benchmarkCase.id).toEqual(benchmarkCase.expected);
      }
    },
    10000, // Increased timeout for JIT cache compilation on cold runs
  );

  it("executes native emitted FWS WASM kernels through the pointer-length ABI", async () => {
    const initialized = await expectCorpus(createFwsWasmAdapter());
    expect(initialized.preparation?.nativeKernels).toBe(true);
    expect(initialized.preparation?.instancePolicy).toBe("reusable-with-reset");
    expect(initialized.preparation?.resetAbi).toBe("fws_reset-v1");
    const unicode = BENCHMARK_CORPUS.find((benchmarkCase) => benchmarkCase.id === "string:unicode:small");
    const dataset = BENCHMARK_CORPUS.find((benchmarkCase) => benchmarkCase.id === "dataset:standard:large");
    expect(unicode).toBeDefined();
    expect(dataset).toBeDefined();
    for (const benchmarkCase of [unicode!, dataset!, unicode!, dataset!])
      expect(await initialized.execute(benchmarkCase.input), benchmarkCase.id).toEqual(benchmarkCase.expected);
    expect(() =>
      initialized.execute({ bytes: Array.from({ length: 70_000 }, () => 1), threshold: 1 }),
    ).toThrow();
    expect(await initialized.execute(unicode!.input)).toEqual(unicode!.expected);
  });

  it("rejects malformed WASM before it can enter a speed ranking", () => {
    expect(() =>
      validateWasmArtifact(new Uint8Array([0, 1, 2]), ["run"]),
    ).toThrow("valid WebAssembly");
  });

  it("does not silently accept a JavaScript capability shim as FWS native work", async () => {
    const wasm = await createFwsWasmAdapter().build();
    const vm = await createFwsVmAdapter("interpret").build();
    expect(wasm.metadata?.nativeKernels).toBe(true);
    expect(vm.metadata?.nativeKernels).toBe(true);
    expect(wasm.metadata?.abi).toBe("pointer-length-native-v1");
    expect(vm.metadata?.abi).toBe("vm-wasm-v1");
  });
});
