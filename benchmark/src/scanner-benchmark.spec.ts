import { describe, expect, it } from "vitest";

import {
  renderScannerMarkdown,
  runScannerBenchmark,
  scannerComparisonHook,
  type Roi,
} from "./scanner-benchmark.ts";
import { createScannerCases } from "./scanner-fixtures.ts";

describe("scanner benchmark harness", () => {
  it("defines representative full-frame and ROI cases", () => {
    const cases = createScannerCases();
    expect(cases.map(({ id }) => id)).toEqual([
      "qr-640x480-full",
      "qr-640x480-roi",
      "qr-1280x720-full",
      "qr-1280x720-roi",
    ]);
    expect(
      cases.every(
        ({ image }) => image.data.length === image.width * image.height * 4,
      ),
    ).toBe(true);
    expect(cases.filter(({ roi }) => roi !== undefined)).toHaveLength(2);
  });

  it("records the public raw/session comparison and its preprocessing limitation", () => {
    const hook = scannerComparisonHook();
    expect(hook.adapted).toBe("available");
    expect(hook.rawSession).toBe("available");
    expect(hook.limitation).toContain("preprocessing");
    expect(hook.limitation).toContain("ImageLike");
  });

  it("measures separate phases with an injectable façade", async () => {
    const calls: string[] = [];
    const rawInputs: Array<{ width: number; height: number; roi?: Roi }> = [];
    const report = await runScannerBenchmark({
      warmupIterations: 0,
      sampleIterations: 1,
      cases: [createScannerCases()[0]!],
      scanner: {
        imageDataToLuma: (image) => {
          calls.push("preprocess");
          return {
            width: image.width,
            height: image.height,
            data: new Uint8Array(image.width * image.height),
          };
        },
        contrastStretchLuma: (image) => {
          calls.push("stretch");
          return image;
        },
        scanImageData: () => {
          calls.push("scan");
          return { format: "qr", value: "https://mission-platform.dev" };
        },
        createScannerRawPointerSessionAsync: async () => ({
          scan: (image, roi) => {
            calls.push("raw-scan");
            rawInputs.push({ width: image.width, height: image.height, roi });
            return { format: "qr", value: "https://mission-platform.dev" };
          },
        }),
      },
    });
    expect(report.measurements.map(({ phase }) => phase)).toEqual([
      "preprocess",
      "marshal-proxy",
      "adapted-scan",
      "raw-session-scan",
    ]);
    expect(report.correctness).toHaveLength(2);
    expect(report.correctness.every(({ status }) => status === "passed")).toBe(
      true,
    );
    expect(calls).toContain("scan");
    expect(calls).toContain("raw-scan");
    expect(rawInputs[0]).toEqual({
      width: 640,
      height: 480,
      roi: undefined,
    });
    expect(renderScannerMarkdown(report)).toContain("marshal-proxy");
    expect(renderScannerMarkdown(report)).toContain("raw-session-scan");
  });

  it("rejects zero measured samples", async () => {
    await expect(runScannerBenchmark({ sampleIterations: 0 })).rejects.toThrow(
      "sampleIterations must be a positive integer",
    );
  });
});
