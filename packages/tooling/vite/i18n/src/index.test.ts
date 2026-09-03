import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { i18nPlugin } from ".";

describe("i18nPlugin", () => {
  it("resolves virtual modules", () => {
    const plugin = i18nPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;

    expect(resolveId("virtual:i18n-resources")).toBe(
      "\0virtual:i18n-resources",
    );
    expect(resolveId("virtual:i18n-locale-en")).toBe(
      "\0virtual:i18n-locale-en",
    );
    expect(resolveId("virtual:i18n-locales")).toBe("\0virtual:i18n-locales");
    expect(resolveId("other-module")).toBeUndefined();
  });

  it("loads the supported-locales module with the default locale first", () => {
    const plugin = i18nPlugin({ localesDir: "does-not-exist" });
    const load = plugin.load as (id: string) => string | undefined;

    const code = load("\0virtual:i18n-locales");
    expect(code).toContain("export const supportedLocales");
    // With no discoverable locale files, only the default locale is present.
    expect(code).toContain('export const supportedLocales = ["en"]');
    expect(code).toContain('export const defaultLocale = "en"');
    expect(code).toContain("export default supportedLocales");

    // Honours a custom default locale.
    const custom = i18nPlugin({
      localesDir: "does-not-exist",
      defaultLocale: "fr",
    });
    const loadCustom = custom.load as (id: string) => string | undefined;
    expect(loadCustom("__x00__virtual:i18n-locales")).toContain(
      'export const defaultLocale = "fr"',
    );
  });

  it("loads the virtual resources module for both null-byte and encoded ids", () => {
    const plugin = i18nPlugin({ localesDir: "does-not-exist" });
    const load = plugin.load as (id: string) => string | undefined;

    // Standard Vite environments hand back the raw null-byte id.
    expect(load("\0virtual:i18n-resources")).toContain(
      "export const resources",
    );
    // Isolated module runners (e.g. the Cloudflare Worker environment) hand
    // back the URL-safe `__x00__` placeholder without decoding it first.
    expect(load("__x00__virtual:i18n-resources")).toContain(
      "export const resources",
    );
    expect(load("__x00__virtual:i18n-locale-en")).toContain(
      "export const resources",
    );
    expect(load("\0some-other-virtual")).toBeUndefined();
  });

  it("surfaces malformed locale YAML with the source file path", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "mission-platform-i18n-"),
    );
    const localePath = path.join(root, "src/locales/en.yaml");
    fs.mkdirSync(path.dirname(localePath), { recursive: true });
    fs.writeFileSync(localePath, "common: [unclosed\n");

    try {
      const plugin = i18nPlugin();
      const configResolved = plugin.configResolved as (config: {
        root: string;
      }) => void;
      configResolved({ root });
      const load = plugin.load as (id: string) => string | undefined;

      expect(() => load("\0virtual:i18n-resources")).toThrow(localePath);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("surfaces type-shim generation failures", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "mission-platform-i18n-"),
    );
    const shimPath = path.join(root, "shim-directory");
    fs.mkdirSync(shimPath);

    try {
      const plugin = i18nPlugin({ typeShimPath: "shim-directory" });
      const configResolved = plugin.configResolved as (config: {
        root: string;
      }) => void;

      expect(() => configResolved({ root })).toThrow(shimPath);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("generates safe locale literals and rejects hostile locale identifiers", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "mission-platform-i18n-"),
    );
    const localesPath = path.join(root, "src/locales");
    fs.mkdirSync(localesPath, { recursive: true });
    fs.writeFileSync(path.join(localesPath, "en-US.yaml"), "common: {}\n");

    try {
      const plugin = i18nPlugin();
      const configResolved = plugin.configResolved as (config: {
        root: string;
      }) => void;

      configResolved({ root });

      const shim = fs.readFileSync(
        path.join(localesPath, "i18n-locales.d.ts"),
        "utf8",
      );
      expect(shim).toContain('readonly ["en", "en-US"]');
      expect(shim).toContain('defaultLocale: "en"');
      expect(shim).not.toContain("globalThis.hacked");

      fs.writeFileSync(
        path.join(localesPath, "en'; globalThis.hacked = true; .yaml"),
        "common: {}\n",
      );
      expect(() => configResolved({ root })).toThrow(
        /Invalid i18n locale identifier/,
      );
      const hostileDefault = i18nPlugin({
        defaultLocale: "en'; globalThis.hacked = true; //",
      });
      const hostileDefaultConfigResolved =
        hostileDefault.configResolved as (config: { root: string }) => void;
      expect(() => hostileDefaultConfigResolved({ root })).toThrow(
        /Invalid i18n locale identifier/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
