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
});
