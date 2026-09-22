/**
 * Package metadata and discovery for external consumers of Mission Platform packages.
 *
 * Allows consumers to discover publishable packages, learn which export conditions
 * and peer dependencies are required for their framework, and generate install commands.
 */
import {
  findMember,
  listGroup,
  readMemberDetails,
  type WorkspaceMember,
} from "./scanner.ts";

export type ConsumerPackageCategory =
  "all" | "ui" | "core" | "integrations" | "content" | "tooling";

export interface ConsumerPackageSummary {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: ConsumerPackageCategory;
  readonly exportConditions: readonly string[];
  readonly publishable: boolean;
}

export interface ConsumerPackageInfo extends ConsumerPackageSummary {
  readonly installCommands: {
    readonly pnpm: string;
    readonly npm: string;
    readonly yarn: string;
    readonly bun: string;
  };
  readonly peerDependencies: Record<string, string>;
  readonly frameworkPeerDependencies: Record<string, readonly string[]>;
  readonly quickStartSnippet: string;
}

const PACKAGE_CATEGORIES: Record<string, ConsumerPackageCategory> = {
  "@mission-platform/components": "ui",
  "@mission-platform/tokens": "ui",
  "@mission-platform/icons": "ui",
  "@mission-platform/theme": "ui",
  "@mission-platform/typography": "ui",
  "@mission-platform/float": "ui",
  "@mission-platform/router": "core",
  "@mission-platform/i18n": "core",
  "@mission-platform/breakpoints": "core",
  "@mission-platform/scheduler": "core",
  "@mission-platform/observers": "core",
  "@mission-platform/rxjs": "core",
  "@mission-platform/code-scanner": "integrations",
  "@mission-platform/barcode": "integrations",
  "@mission-platform/forms": "integrations",
  "@mission-platform/d3": "integrations",
  "@mission-platform/monaco": "integrations",
  "@mission-platform/content": "content",
  "@mission-platform/email-components": "content",
  "@mission-platform/email-renderer": "content",
  "@mission-platform/seo": "content",
  "@mission-platform/harper": "content",
  "@mission-platform/hunspell": "content",
  "@mission-platform/vite-config": "tooling",
  "@mission-platform/typescript-config": "tooling",
  "@mission-platform/eslint-config": "tooling",
  "@mission-platform/stylelint-config": "tooling",
  "@mission-platform/prettier-config": "tooling",
};

const MULTI_FRAMEWORK_PACKAGES = new Set<string>([
  "@mission-platform/components",
  "@mission-platform/icons",
]);

const FRAMEWORK_CONDITIONS: readonly string[] = [
  "mp:vue",
  "mp:react",
  "mp:solid",
  "mp:svelte",
  "mp:web-component",
];

const FRAMEWORK_PEER_DEPS: Record<string, readonly string[]> = {
  vue: ["vue@^3.5.0"],
  react: ["react@^18.0.0 || ^19.0.0", "react-dom@^18.0.0 || ^19.0.0"],
  solid: ["solid-js@^1.8.0"],
  svelte: ["svelte@^5.0.0"],
  "web-components": ["lit@^3.0.0"],
};

const QUICK_STARTS: Record<string, Record<string, string>> = {
  "@mission-platform/components": {
    vue: "import { ForgeButton } from '@mission-platform/components';",
    react: "import { ForgeButton } from '@mission-platform/components';",
    solid: "import { ForgeButton } from '@mission-platform/components';",
    svelte: "import { ForgeButton } from '@mission-platform/components';",
    "web-components": '<forge-button variant="primary">Click</forge-button>',
  },
  "@mission-platform/tokens": {
    default: "import '@mission-platform/tokens/css/tokens.css';",
  },
  "@mission-platform/icons": {
    vue: "import { ForgeIconBell } from '@mission-platform/icons';",
    react: "import { ForgeIconBell } from '@mission-platform/icons';",
    solid: "import { ForgeIconBell } from '@mission-platform/icons';",
    svelte: "import { ForgeIconBell } from '@mission-platform/icons';",
    "web-components": '<forge-icon-bell size="md"></forge-icon-bell>',
  },
  "@mission-platform/router": {
    default:
      "import { MpBrowserHistory, createRouter } from '@mission-platform/router';",
  },
  "@mission-platform/i18n": {
    default: "import { createI18n } from '@mission-platform/i18n';",
  },
};

/**
 * Extract the default or first available quick start snippet from a quick start mapping.
 */
function getDefaultQuickStart(
  quickStartMap: Record<string, string>,
  name: string,
): string {
  const fallback = quickStartMap.default || Object.values(quickStartMap)[0];
  return fallback || `import '${name}';`;
}

/**
 * Resolve an idiomatic code snippet for importing and starting with a package.
 */
function resolveQuickStartSnippet(name: string, framework?: string): string {
  const quickStartMap = QUICK_STARTS[name];
  if (!quickStartMap) {
    return `import * as Platform from '${name}';`;
  }
  if (framework) {
    const fwSnippet = quickStartMap[framework];
    if (fwSnippet) return fwSnippet;
  }
  return getDefaultQuickStart(quickStartMap, name);
}

/**
 * List all consumer packages with categorization and export condition support.
 */
export function listConsumerPackages(
  options: {
    category?: ConsumerPackageCategory;
    filter?: string;
  } = {},
): readonly ConsumerPackageSummary[] {
  const members = listGroup("packages");

  const summaries: ConsumerPackageSummary[] = members
    .filter(
      (m: WorkspaceMember) =>
        !m.private && m.name.startsWith("@mission-platform/"),
    )
    .map((m: WorkspaceMember) => {
      const category = PACKAGE_CATEGORIES[m.name] ?? "core";
      const exportConditions = MULTI_FRAMEWORK_PACKAGES.has(m.name)
        ? FRAMEWORK_CONDITIONS
        : [];
      return {
        name: m.name,
        version: m.version,
        description: m.description,
        category,
        exportConditions,
        publishable: !m.private,
      };
    });

  let result = summaries;

  if (options.category && options.category !== "all") {
    result = result.filter((pkg) => pkg.category === options.category);
  }

  if (options.filter) {
    const textFilter = options.filter.toLowerCase().trim();
    result = result.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(textFilter) ||
        pkg.description.toLowerCase().includes(textFilter),
    );
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Normalize package name with the monorepo scope prefix.
 */
function normalizePackageName(packageName: string): string {
  if (packageName.startsWith("@mission-platform/")) {
    return packageName;
  }
  return `@mission-platform/${packageName}`;
}

/**
 * Resolve declared peer dependency names to version ranges from package manifest.
 */
function resolvePeerDependencyVersions(
  declaredDependencies: readonly string[],
  manifestPeerDeps?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const dep of declaredDependencies) {
    result[dep] = manifestPeerDeps?.[dep] ?? "latest";
  }
  return result;
}

/**
 * Build package installation command map across popular package managers.
 */
function buildInstallCommands(name: string): {
  readonly pnpm: string;
  readonly npm: string;
  readonly yarn: string;
  readonly bun: string;
} {
  return {
    pnpm: `pnpm add ${name}`,
    npm: `npm install ${name}`,
    yarn: `yarn add ${name}`,
    bun: `bun add ${name}`,
  };
}

/**
 * Resolve export conditions applicable to a consumer package.
 */
function resolveExportConditions(name: string): readonly string[] {
  return MULTI_FRAMEWORK_PACKAGES.has(name) ? FRAMEWORK_CONDITIONS : [];
}

/**
 * Get comprehensive metadata, installation commands, peer dependencies, and quickstart
 * guidance for a specific consumer package.
 */
export function getConsumerPackageInfo(
  packageName: string,
  framework?: string,
): ConsumerPackageInfo | undefined {
  const normalized = normalizePackageName(packageName);

  const member = findMember("packages", normalized);
  if (!member || member.private) {
    return undefined;
  }

  const name = member.name;
  const category = PACKAGE_CATEGORIES[name] ?? "core";
  const exportConditions = resolveExportConditions(name);
  const quickStartSnippet = resolveQuickStartSnippet(name, framework);
  const details = readMemberDetails(member);
  const peerDependencies = resolvePeerDependencyVersions(
    member.peerDependencies,
    details.manifest.peerDependencies,
  );

  return {
    name,
    version: member.version,
    description: member.description,
    category,
    exportConditions,
    publishable: !member.private,
    installCommands: buildInstallCommands(name),
    peerDependencies,
    frameworkPeerDependencies: FRAMEWORK_PEER_DEPS,
    quickStartSnippet,
  };
}
