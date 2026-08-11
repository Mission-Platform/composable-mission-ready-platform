/**
 * The two aggregate artifacts the Ghost target emits.
 *
 * A Handlebars partial is untyped and undiscoverable: nothing in a `.hbs` file
 * says which hash parameters it accepts, what they mean, or what happens when
 * one is omitted. `forge-components.json` restores that contract for tooling and
 * for the humans wiring the partials into a theme, and it is the only place the
 * neutral defaults and JSDoc descriptions survive into the output tree.
 *
 * `ghost-theme-config.json` is a different thing entirely: a drop-in fragment
 * for a theme's `package.json`, exposing the `@cmsSetting`-tagged fields in
 * Ghost Admin so an editor can change them without touching the theme. Ghost's
 * `config.custom` block is deliberately small — five types, twenty entries — so
 * this module is where the neutral model is narrowed to fit, always by
 * degrading and never by failing.
 */
import {
  contentFields,
  slotFields,
  toTechnicalName,
} from "@mission-platform/forge-cms-plugin-api";

import {
  FORGE_GHOST_FIELD_UNSUPPORTED,
  FORGE_GHOST_SETTING_LIMIT,
  ghostWarning,
} from "./diagnostics.js";
import { ghostPartialName } from "./template.js";

import type {
  ContentComponent,
  ContentDefaultValue,
  ContentField,
} from "@mission-platform/forge-cms-plugin-api";
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

/** The file the partial-parameter contract is written to. */
export const GHOST_COMPONENTS_MANIFEST = "forge-components.json";

/** The file the `config.custom` fragment is written to. */
export const GHOST_THEME_CONFIG_MANIFEST = "ghost-theme-config.json";

/** The default theme name used when the caller does not supply one. */
export const DEFAULT_GHOST_THEME_NAME = "forge";

/**
 * The maximum number of entries Ghost accepts in `config.custom`.
 *
 * Ghost rejects a theme that exceeds it at upload time, which would turn a
 * successful Forge build into a failure the author only discovers in Ghost
 * Admin — hence the truncation and the warning here.
 */
export const GHOST_SETTING_LIMIT = 20;

/** The five setting types Ghost's `config.custom` block accepts. */
export type GhostSettingType =
  "select" | "boolean" | "color" | "image" | "text";

/** One entry of a theme's `config.custom` block. */
export interface GhostSetting {
  readonly type: GhostSettingType;
  readonly default?: ContentDefaultValue;
  readonly options?: readonly string[];
}

/** The `config.custom` fragment a theme's `package.json` merges in. */
export interface GhostThemeConfig {
  readonly name: string;
  readonly config: { readonly custom: Record<string, GhostSetting> };
}

/** One hash parameter of a generated partial. */
export interface GhostParameter {
  readonly name: string;
  readonly type: GhostSettingType;
  readonly required: boolean;
  readonly default?: ContentDefaultValue;
  readonly description?: string;
  readonly options?: readonly string[];
}

/** One slot of a generated partial. */
export interface GhostSlot {
  /** The slot name (`default` for the partial's block content). */
  readonly name: string;
  /** The hash parameter the slot is passed as, or the neutral `content` field. */
  readonly prop: string;
  /** `true` when the slot is filled by `{{#> …}}` block content. */
  readonly block: boolean;
}

/** One component's entry in `forge-components.json`. */
export interface GhostComponentEntry {
  readonly name: string;
  readonly displayName: string;
  readonly partial: string;
  readonly parameters: readonly GhostParameter[];
  readonly slots: readonly GhostSlot[];
}

/** The whole partial-parameter contract. */
export interface GhostComponentsManifest {
  readonly components: readonly GhostComponentEntry[];
}

/**
 * The Ghost setting type a neutral field kind narrows to.
 *
 * `color` is part of Ghost's vocabulary but no neutral kind maps onto it: a
 * colour is an ordinary string in TypeScript and guessing from a prop's name
 * would make the projection non-deterministic.
 */
export function ghostSettingType(field: ContentField): GhostSettingType {
  switch (field.kind.kind) {
    case "option": {
      return "select";
    }
    case "boolean": {
      return "boolean";
    }
    case "asset": {
      return "image";
    }
    default: {
      return "text";
    }
  }
}

/** Whether a field loses information when narrowed to a Ghost setting type. */
function isDegraded(field: ContentField): boolean {
  return field.kind.kind === "number";
}

/** The warning a lossy narrowing reports. */
function degradationWarning(
  component: ContentComponent,
  field: ContentField,
  fileName: string,
): CompilerDiagnostic {
  return ghostWarning(
    FORGE_GHOST_FIELD_UNSUPPORTED,
    `Ghost has no numeric setting type; "${field.prop}" on ${component.names.publicName} is exposed as text.`,
    fileName,
  );
}

/** Project one field onto its documented partial parameter. */
function toParameter(field: ContentField): GhostParameter {
  const parameter: {
    -readonly [K in keyof GhostParameter]: GhostParameter[K];
  } = {
    name: field.prop,
    type: ghostSettingType(field),
    required: field.required,
  };
  if (field.defaultValue !== undefined) {
    parameter.default = field.defaultValue;
  }
  if (field.description !== undefined) {
    parameter.description = field.description;
  }
  if (field.kind.kind === "option") {
    parameter.options = field.kind.options;
  }
  return parameter;
}

/** Project one slot field onto its documented slot entry. */
function toSlot(field: ContentField): GhostSlot {
  const name = field.slotName ?? field.prop;
  return { name, prop: field.prop, block: name === "default" };
}

/** Project one component onto its `forge-components.json` entry. */
export function toGhostComponentEntry(
  component: ContentComponent,
): GhostComponentEntry {
  return {
    name: component.names.technicalName,
    displayName: component.names.displayName,
    partial: ghostPartialName(component),
    parameters: contentFields(component).map((field) => toParameter(field)),
    slots: slotFields(component).map((field) => toSlot(field)),
  };
}

/** Emit the partial-parameter contract as pretty-printed JSON. */
export function emitGhostComponentsManifest(
  components: readonly ContentComponent[],
): string {
  const manifest: GhostComponentsManifest = {
    components: components.map((component) => toGhostComponentEntry(component)),
  };
  return `${JSON.stringify(manifest, undefined, 2)}\n`;
}

/** Project one `@cmsSetting` field onto a Ghost custom setting. */
function toSetting(field: ContentField): GhostSetting {
  const setting: { -readonly [K in keyof GhostSetting]: GhostSetting[K] } = {
    type: ghostSettingType(field),
  };
  if (field.kind.kind === "option") {
    setting.options = field.kind.options;
  }
  if (field.defaultValue !== undefined) {
    setting.default = field.defaultValue;
  }
  return setting;
}

/**
 * Build the `config.custom` fragment from every `@cmsSetting`-tagged field.
 *
 * Settings are site-wide, so they are keyed by the field's snake_cased prop
 * name rather than by component: two components tagging the same prop describe
 * the same knob, and Ghost only has one namespace for them.
 */
export function buildGhostThemeConfig(
  components: readonly ContentComponent[],
  themeName: string,
  diagnostics: CompilerDiagnostic[],
): GhostThemeConfig {
  const custom: Record<string, GhostSetting> = {};
  let dropped = 0;

  for (const component of components) {
    for (const field of contentFields(component)) {
      if (!field.setting) {
        continue;
      }
      const key = toTechnicalName(field.prop);
      if (key in custom) {
        continue;
      }
      if (Object.keys(custom).length >= GHOST_SETTING_LIMIT) {
        dropped += 1;
        continue;
      }
      if (isDegraded(field)) {
        diagnostics.push(
          degradationWarning(component, field, GHOST_THEME_CONFIG_MANIFEST),
        );
      }
      custom[key] = toSetting(field);
    }
  }

  if (dropped > 0) {
    diagnostics.push(
      ghostWarning(
        FORGE_GHOST_SETTING_LIMIT,
        `Ghost allows at most ${GHOST_SETTING_LIMIT} custom theme settings; ${dropped} @cmsSetting field${dropped === 1 ? " was" : "s were"} dropped.`,
        GHOST_THEME_CONFIG_MANIFEST,
      ),
    );
  }

  return { name: themeName, config: { custom } };
}

/** Emit the `config.custom` fragment as pretty-printed JSON. */
export function emitGhostThemeConfig(
  components: readonly ContentComponent[],
  themeName: string,
  diagnostics: CompilerDiagnostic[],
): string {
  const config = buildGhostThemeConfig(components, themeName, diagnostics);
  return `${JSON.stringify(config, undefined, 2)}\n`;
}
