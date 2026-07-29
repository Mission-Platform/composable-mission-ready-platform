import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Plugin } from "vite";

export interface I18nPluginOptions {
  defaultLocale?: string;
  localesDir?: string;
}

const VIRTUAL_MODULE_ID = "virtual:i18n-resources";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
const VIRTUAL_LOCALE_PREFIX = "virtual:i18n-locale-";
const RESOLVED_VIRTUAL_LOCALE_PREFIX = "\0" + VIRTUAL_LOCALE_PREFIX;

export function i18nPlugin(options: I18nPluginOptions = {}): Plugin {
  let root = process.cwd();

  return {
    name: "@mission-platform/vite-plugin-i18n",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      if (id.startsWith(VIRTUAL_LOCALE_PREFIX)) {
        return (
          RESOLVED_VIRTUAL_LOCALE_PREFIX +
          id.slice(VIRTUAL_LOCALE_PREFIX.length)
        );
      }
      return;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const defaultLocale = options.defaultLocale ?? "en";
        const localesDirectory = options.localesDir
          ? path.resolve(root, options.localesDir)
          : path.resolve(root, "src/locales");
        const resources: Record<string, unknown> = {};

        if (fs.existsSync(localesDirectory)) {
          const files = fs.readdirSync(localesDirectory);
          for (const file of files) {
            if (file.endsWith(".yaml") || file.endsWith(".yml")) {
              const locale = path.basename(file, path.extname(file));
              try {
                const content = fs.readFileSync(
                  path.join(localesDirectory, file),
                  "utf8",
                );
                const parsed = yaml.load(content);
                if (parsed && typeof parsed === "object") {
                  resources[locale] = parsed;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        return `export const resources = ${JSON.stringify(resources)};\nexport const defaultLocale = ${JSON.stringify(defaultLocale)};\nexport default resources;\n`;
      }

      if (id.startsWith(RESOLVED_VIRTUAL_LOCALE_PREFIX)) {
        const locale = id.slice(RESOLVED_VIRTUAL_LOCALE_PREFIX.length);
        const localesDirectory = options.localesDir
          ? path.resolve(root, options.localesDir)
          : path.resolve(root, "src/locales");
        let localeData: Record<string, unknown> = {};

        const yamlPath = path.join(localesDirectory, `${locale}.yaml`);
        const ymlPath = path.join(localesDirectory, `${locale}.yml`);
        const filePath = fs.existsSync(yamlPath)
          ? yamlPath
          : fs.existsSync(ymlPath)
            ? ymlPath
            : undefined;

        if (filePath) {
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const parsed = yaml.load(content);
            if (parsed && typeof parsed === "object") {
              localeData = parsed as Record<string, unknown>;
            }
          } catch {
            // Ignore parse errors
          }
        }

        const resources = { [locale]: localeData };
        return `export const resources = ${JSON.stringify(resources)};\nexport default resources;\n`;
      }

      return;
    },
  };
}

export default i18nPlugin;
