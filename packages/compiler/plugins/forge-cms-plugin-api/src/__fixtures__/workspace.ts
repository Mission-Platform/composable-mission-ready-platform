import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { BADGE, COUNTER, GRID, LAYOUT } from "./components.js";

export interface WorkspaceComponentDefinition {
  folder: string;
  neutralName: string;
  publicName: string;
  sourceDir?: string;
  propertiesType?: string;
  source: string;
}

export interface CmsWorkspace {
  root: string;
  componentsModule: string;
  outDirectory: string;
  cleanup: () => void;
}

export const BADGE_COMPONENT: WorkspaceComponentDefinition = {
  folder: "forge-badge",
  neutralName: "ForgeBadge",
  publicName: "Badge",
  propertiesType: "BadgeProperties",
  source: BADGE,
};

export const GRID_COMPONENT: WorkspaceComponentDefinition = {
  folder: "forge-grid",
  neutralName: "ForgeGrid",
  publicName: "Grid",
  propertiesType: "GridProperties",
  source: GRID,
};

export const COUNTER_COMPONENT: WorkspaceComponentDefinition = {
  folder: "forge-counter",
  neutralName: "ForgeCounter",
  publicName: "Counter",
  propertiesType: "CounterProperties",
  source: COUNTER,
};

export const LAYOUT_COMPONENT: WorkspaceComponentDefinition = {
  folder: "forge-layout",
  neutralName: "ForgeLayout",
  publicName: "Layout",
  propertiesType: "LayoutProperties",
  source: LAYOUT,
};

export const NESTED_BADGE_COMPONENT: WorkspaceComponentDefinition = {
  ...BADGE_COMPONENT,
  sourceDir: "atoms/forge-badge",
};

export function createCmsWorkspace(
  components: readonly WorkspaceComponentDefinition[],
): CmsWorkspace {
  const root = mkdtempSync(path.join(os.tmpdir(), "forge-cms-workspace-"));
  const componentsDirectory = path.join(root, "src/components");
  mkdirSync(componentsDirectory, { recursive: true });

  const barrel: string[] = [];
  for (const component of components) {
    const sourceDirectory = component.sourceDir ?? component.folder;
    const folder = path.join(componentsDirectory, sourceDirectory);
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      path.join(folder, `${component.folder}.tsx`),
      component.source,
      "utf8",
    );
    const types =
      component.propertiesType === undefined
        ? ""
        : `, type ${component.propertiesType}`;
    writeFileSync(
      path.join(folder, "index.ts"),
      `export { ${component.neutralName}${types} } from './${component.folder}';\n`,
      "utf8",
    );
    barrel.push(
      `export { ${component.neutralName}${types} } from './${sourceDirectory}';`,
    );
  }
  const componentsModule = path.join(componentsDirectory, "index.ts");
  writeFileSync(componentsModule, `${barrel.join("\n")}\n`, "utf8");

  const outDirectory = path.join(root, "out");
  return {
    root,
    componentsModule,
    outDirectory,
    cleanup: () => {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
