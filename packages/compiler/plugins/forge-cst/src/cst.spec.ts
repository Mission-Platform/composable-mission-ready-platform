import { describe, expect, it, vi } from "vitest";

import { parseCst } from "./cst.js";

const { parseSyncMock } = vi.hoisted(() => ({
  parseSyncMock: vi.fn(),
}));

vi.mock("oxc-parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("oxc-parser")>();
  parseSyncMock.mockImplementation(actual.parseSync);
  return { ...actual, parseSync: parseSyncMock };
});

describe("parseCst", () => {
  it("classifies declaration files as dts", () => {
    parseSyncMock.mockClear();

    parseCst("declare const version: string;\n", "types.d.ts");

    expect(parseSyncMock).toHaveBeenCalledOnce();
    expect(parseSyncMock.mock.calls[0]?.[2]).toMatchObject({ lang: "dts" });
  });
});
