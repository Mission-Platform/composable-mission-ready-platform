import { analyzeForgeModule } from "@mission-platform/vite-plugin-forge";
import { parseTsx } from "@mission-platform/vite-plugin-forge/compiler/ast.js";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  BADGE,
  BUTTON,
  COUNTER,
  GRID,
  LAYOUT,
  SITE_HEADER,
  badgeNames,
  buttonNames,
  counterNames,
  gridNames,
  layoutNames,
  siteHeaderNames,
} from "./__fixtures__/components.js";
import {
  analyzeContentComponent,
  deriveContentComponentNames,
} from "./analyze.js";
import { classifyType, collectTypeAliases } from "./classify.js";
import { toDisplayName, toKebabName, toTechnicalName } from "./names.js";

import type {
  ContentComponent,
  ContentComponentNamesInput,
  ContentField,
} from "./content-model.js";
import type { SemanticModule } from "@mission-platform/forge-plugin-api";

function analyze(
  source: string,
  names: ContentComponentNamesInput,
  semantic?: SemanticModule,
): ContentComponent {
  return analyzeContentComponent(
    parseTsx(`${names.folder ?? "component"}.tsx`, source),
    names,
    semantic,
  );
}

function irFor(
  source: string,
  names: ContentComponentNamesInput,
): SemanticModule {
  return analyzeForgeModule({
    source,
    fileName: `${names.folder ?? "component"}.tsx`,
    moduleKind: "component",
    componentName: names.neutralName,
  });
}

function field(component: ContentComponent, property: string): ContentField {
  const found = component.fields.find((entry) => entry.prop === property);
  if (found === undefined) {
    const present = component.fields.map((entry) => entry.prop).join(", ");
    throw new Error(
      `No field "${property}" in ${component.names.publicName} (present: ${present}).`,
    );
  }
  return found;
}

/** The type node of the first property of the named interface in a source file. */
function firstPropertyType(
  sourceFile: ts.SourceFile,
  interfaceName: string,
): ts.TypeNode {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isInterfaceDeclaration(statement) ||
      statement.name.text !== interfaceName
    ) {
      continue;
    }
    for (const member of statement.members) {
      if (ts.isPropertySignature(member) && member.type !== undefined) {
        return member.type;
      }
    }
  }
  throw new Error(`No property signature found on "${interfaceName}".`);
}

describe("name derivation", () => {
  it("projects a public name onto technical, display, and kebab forms", () => {
    expect(toTechnicalName("InView")).toBe("in_view");
    expect(toDisplayName("InView")).toBe("In View");
    expect(toKebabName("InView")).toBe("in-view");
  });

  it("derives the full name set from the neutral and public names", () => {
    expect(
      deriveContentComponentNames({
        neutralName: "ForgeInView",
        publicName: "InView",
      }),
    ).toEqual({
      neutralName: "ForgeInView",
      publicName: "InView",
      technicalName: "in_view",
      displayName: "In View",
      folder: "forge-in-view",
      propertiesType: undefined,
    });
  });
});

describe("analyzeContentComponent", () => {
  it("classifies literal-union props as ordered option fields with their JSDoc and defaults", () => {
    const badge = analyze(BADGE, badgeNames);

    expect(badge.fields.map((entry) => entry.prop)).toEqual([
      "variant",
      "size",
      "pill",
      "content",
    ]);

    const variant = field(badge, "variant");
    expect(variant.kind).toEqual({
      kind: "option",
      options: ["default", "primary", "secondary"],
    });
    expect(variant.position).toBe(0);
    expect(variant.description).toBe("Visual tone of the badge.");
    expect(variant.defaultValue).toBe("default");
    expect(variant.required).toBe(false);

    const size = field(badge, "size");
    expect(size.kind).toEqual({ kind: "option", options: ["sm", "md", "lg"] });
    expect(size.defaultValue).toBe("md");

    const pill = field(badge, "pill");
    expect(pill.kind).toEqual({ kind: "boolean" });
    expect(pill.translatable).toBe(false);
  });

  it("drops callback props and degrades mixed unions to text", () => {
    const button = analyze(BUTTON, buttonNames);

    expect(button.fields.some((entry) => entry.prop === "onClick")).toBe(false);

    const badge = field(button, "badge");
    expect(badge.kind).toEqual({ kind: "text" });
    expect(badge.translatable).toBe(true);
    expect(badge.tsType).toBe("string | number");
  });

  it("classifies numeric props and keeps their numeric default", () => {
    const grid = analyze(GRID, gridNames);
    const rows = field(grid, "rows");
    expect(rows.kind).toEqual({ kind: "number" });
    expect(rows.defaultValue).toBe(3);
  });

  it("exposes named and default slots as children fields", () => {
    const layout = analyze(LAYOUT, layoutNames);

    const header = field(layout, "header");
    expect(header.kind).toEqual({ kind: "children" });
    expect(header.isSlot).toBe(true);
    expect(header.slotName).toBe("header");

    const content = field(layout, "content");
    expect(content.kind).toEqual({ kind: "children" });
    expect(content.slotName).toBe("default");

    expect(layout.slots).toEqual(["header", "default"]);
  });

  it("records the required flag for props without a question token", () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge';",
      "export interface TitleProperties {",
      "  /** Heading text. */",
      "  text: string;",
      "}",
      "export function ForgeTitle(properties: TitleProperties): MpElement {",
      "  return <h1>{properties.text}</h1>;",
      "}",
    ].join("\n");
    const title = analyze(source, {
      neutralName: "ForgeTitle",
      publicName: "Title",
      folder: "forge-title",
      propertiesType: "TitleProperties",
    });
    expect(field(title, "text").required).toBe(true);
  });

  it("marks @cmsSetting props as site-wide settings", () => {
    const header = analyze(SITE_HEADER, siteHeaderNames);
    expect(field(header, "brandName").setting).toBe(true);
    expect(field(header, "brandName").description).toBe(
      "Brand name rendered in the header.",
    );
    expect(field(header, "sticky").setting).toBe(false);
  });

  it("reports a component with no analysable props as an empty model", () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge';",
      "export function ForgeRule(): MpElement {",
      '  return <hr class="rule" />;',
      "}",
    ].join("\n");
    const rule = analyze(source, {
      neutralName: "ForgeRule",
      publicName: "Rule",
      folder: "forge-rule",
    });
    expect(rule.fields).toEqual([]);
    expect(rule.slots).toEqual([]);
    expect(rule.interactive).toBe(false);
  });
});

describe("interactivity", () => {
  it("reports a presentational component as non-interactive", () => {
    const badge = analyze(BADGE, badgeNames, irFor(BADGE, badgeNames));
    expect(badge.interactive).toBe(false);
  });

  it("reports a component with state and events as interactive", () => {
    const counter = analyze(
      COUNTER,
      counterNames,
      irFor(COUNTER, counterNames),
    );
    expect(counter.interactive).toBe(true);
  });
});

describe("classifyType", () => {
  it("terminates on a recursive type alias instead of recursing forever", () => {
    const sourceFile = parseTsx(
      "loop.tsx",
      [
        "export type Loop = Loop;",
        "export interface LoopProperties {",
        "  value?: Loop;",
        "}",
      ].join("\n"),
    );
    expect(
      classifyType(
        firstPropertyType(sourceFile, "LoopProperties"),
        collectTypeAliases(sourceFile),
      ),
    ).toBeUndefined();
  });

  it("recognises the richtext, asset, and link marker types", () => {
    const sourceFile = parseTsx(
      "markers.tsx",
      [
        "export interface RichProperties {",
        "  body?: MpRichText;",
        "}",
        "export interface AssetProperties {",
        "  image?: MpAsset;",
        "}",
        "export interface LinkProperties {",
        "  href?: MpLink;",
        "}",
      ].join("\n"),
    );
    const aliases = collectTypeAliases(sourceFile);
    expect(
      classifyType(firstPropertyType(sourceFile, "RichProperties"), aliases),
    ).toEqual({ kind: "richtext" });
    expect(
      classifyType(firstPropertyType(sourceFile, "AssetProperties"), aliases),
    ).toEqual({ kind: "asset" });
    expect(
      classifyType(firstPropertyType(sourceFile, "LinkProperties"), aliases),
    ).toEqual({ kind: "link" });
  });
});
