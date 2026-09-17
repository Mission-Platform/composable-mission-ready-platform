/**
 * Icon catalog discovery and usage inspection for `@mission-platform/icons`.
 *
 * Allows MCP clients and external consumers to discover available icons, filter by
 * category or name, and inspect framework-agnostic import statements and properties.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { groupDir, resolveRepoPath } from "./paths.ts";

const ICONS_DIR = join(
  groupDir("packages"),
  "ui",
  "icons",
  "src",
  "components",
);

export interface IconSummary {
  readonly name: string;
  readonly componentName: string;
  readonly category: string;
  readonly subcategory: string;
  readonly fullCategory: string;
}

export interface IconProperties {
  readonly size: string;
  readonly color: string;
  readonly ariaLabel: string;
}

export interface IconUsage extends IconSummary {
  readonly importStatement: string;
  readonly deepImport: string;
  readonly properties: IconProperties;
  readonly examples: Record<string, string>;
  readonly spriteSupport: boolean;
}

/**
 * Convert a kebab-case slug to PascalCase.
 */
function toPascalCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Convert a camelCase or PascalCase name to kebab-case.
 */
function toKebabCase(name: string): string {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Check whether the icons components directory exists on disk.
 */
function iconsDirExists(): boolean {
  try {
    const resolved = resolveRepoPath(ICONS_DIR, "icons components dir");
    return existsSync(resolved) && statSync(resolved).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Extract icon summaries from a specific category and subcategory directory.
 */
function scanSubcategoryIcons(
  subDir: string,
  catName: string,
  subName: string,
  fullCategory: string,
): IconSummary[] {
  const icons: IconSummary[] = [];
  for (const iconEntry of readdirSync(subDir, { withFileTypes: true })) {
    if (!iconEntry.isDirectory()) continue;
    if (!iconEntry.name.startsWith("forge-icon-")) continue;

    const iconName = iconEntry.name;
    icons.push({
      name: iconName,
      componentName: toPascalCase(iconName),
      category: catName,
      subcategory: subName,
      fullCategory,
    });
  }
  return icons;
}

/**
 * Scan all subdirectories below icons components dir and extract icon summaries.
 */
function scanIconsDirectory(resolvedBase: string): {
  icons: IconSummary[];
  categories: string[];
} {
  const allIcons: IconSummary[] = [];
  const categoriesSet = new Set<string>();

  for (const catEntry of readdirSync(resolvedBase, { withFileTypes: true })) {
    if (!catEntry.isDirectory()) continue;
    const catDir = join(resolvedBase, catEntry.name);

    for (const subEntry of readdirSync(catDir, { withFileTypes: true })) {
      if (!subEntry.isDirectory()) continue;
      const subDir = join(catDir, subEntry.name);
      const fullCategory = `${catEntry.name}/${subEntry.name}`;
      categoriesSet.add(fullCategory);

      const subIcons = scanSubcategoryIcons(
        subDir,
        catEntry.name,
        subEntry.name,
        fullCategory,
      );
      allIcons.push(...subIcons);
    }
  }

  allIcons.sort((a, b) => a.name.localeCompare(b.name));
  return { icons: allIcons, categories: [...categoriesSet].sort() };
}

/**
 * Filter icons by category and text search query.
 */
function filterIcons(
  icons: readonly IconSummary[],
  categoryFilter?: string,
  searchFilter?: string,
): IconSummary[] {
  let result = icons as IconSummary[];

  if (categoryFilter) {
    const cat = categoryFilter.toLowerCase().trim();
    result = result.filter(
      (icon) =>
        icon.fullCategory.toLowerCase() === cat ||
        icon.category.toLowerCase() === cat ||
        icon.subcategory.toLowerCase() === cat,
    );
  }

  if (searchFilter) {
    const text = searchFilter.toLowerCase().trim();
    result = result.filter(
      (icon) =>
        icon.name.toLowerCase().includes(text) ||
        icon.componentName.toLowerCase().includes(text),
    );
  }

  return result;
}

/**
 * List all available icons across categories and subcategories.
 */
export function listIcons(
  options: { category?: string; filter?: string; limit?: number } = {},
): {
  readonly icons: readonly IconSummary[];
  readonly total: number;
  readonly categories: readonly string[];
} {
  if (!iconsDirExists()) {
    return { icons: [], total: 0, categories: [] };
  }

  const resolvedBase = resolveRepoPath(ICONS_DIR, "icons base");
  const { icons: allIcons, categories } = scanIconsDirectory(resolvedBase);
  const filtered = filterIcons(allIcons, options.category, options.filter);

  const limit = options.limit ?? 100;
  const sliced = filtered.slice(0, limit);

  return {
    icons: sliced,
    total: filtered.length,
    categories,
  };
}

/**
 * Get detailed usage instructions, import statements, and code examples for a specific icon.
 */
export function getIconUsage(
  nameOrSlug: string,
  framework?: string,
): IconUsage | undefined {
  const normalized = toKebabCase(nameOrSlug);
  const targetName = normalized.startsWith("forge-icon-")
    ? normalized
    : `forge-icon-${normalized}`;

  const { icons } = listIcons({ limit: 1000 });
  const icon = icons.find(
    (i) =>
      i.name === targetName ||
      i.componentName.toLowerCase() === nameOrSlug.toLowerCase(),
  );

  if (!icon) {
    return undefined;
  }

  const comp = icon.componentName;
  const kebab = icon.name;

  const examples: Record<string, string> = {
    vue: `<script setup lang="ts">
import { ${comp} } from '@mission-platform/icons';
</script>

<template>
  <${comp} size="md" color="currentColor" ariaLabel="${comp.replace("ForgeIcon", "")}" />
</template>`,

    react: `import { ${comp} } from '@mission-platform/icons';

export function Example() {
  return <${comp} size="md" color="currentColor" ariaLabel="${comp.replace("ForgeIcon", "")}" />;
}`,

    solid: `import { ${comp} } from '@mission-platform/icons';

export function Example() {
  return <${comp} size="md" color="currentColor" ariaLabel="${comp.replace("ForgeIcon", "")}" />;
}`,

    svelte: `<script lang="ts">
  import { ${comp} } from '@mission-platform/icons';
</script>

<${comp} size="md" color="currentColor" ariaLabel="${comp.replace("ForgeIcon", "")}" />`,

    "web-components": `<!-- Framework-agnostic custom element -->
<${kebab} size="md" color="currentColor" aria-label="${comp.replace("ForgeIcon", "")}"></${kebab}>`,
  };

  const selectedExamples =
    framework && examples[framework]
      ? { [framework]: examples[framework] as string }
      : examples;

  return {
    ...icon,
    importStatement: `import { ${comp} } from '@mission-platform/icons';`,
    deepImport: `import { ${comp} } from '@mission-platform/icons/${icon.category}/${icon.subcategory}/${kebab}';`,
    properties: {
      size: "'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number (default 'md' = 24px)",
      color: "string (defaults to 'currentColor')",
      ariaLabel:
        "string (accessible label; omit for decorative icons to hide from assistive tech)",
    },
    examples: selectedExamples,
    spriteSupport: true,
  };
}
