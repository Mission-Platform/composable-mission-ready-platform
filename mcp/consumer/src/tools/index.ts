/**
 * Tool definitions for the CONSUMER MCP server.
 * Focuses on external project setup and component consumption.
 */
import {
  GUIDE_IDS,
  getGuide,
} from "@mission-platform/mcp-shared/knowledge/guides";
import {
  getComponentStories,
  getComponentUsage,
  listComponents,
} from "@mission-platform/mcp-shared/repo/components";
import {
  getIconUsage,
  listIcons,
} from "@mission-platform/mcp-shared/repo/icons";
import {
  getConsumerPackageInfo,
  listConsumerPackages,
  type ConsumerPackageCategory,
} from "@mission-platform/mcp-shared/repo/packages";
import {
  getRouterSetup,
  type RouterHistoryType,
  type SupportedRouterFramework,
} from "@mission-platform/mcp-shared/repo/routing";
import {
  buildTokenOverrideScss,
  type OverrideGroup,
  readTokenOverrideSchema,
  validateOverrideDocument,
} from "@mission-platform/mcp-shared/repo/token-overrides";
import {
  listOverridableTokenVariables,
  readTokens,
} from "@mission-platform/mcp-shared/repo/tokens";
import { z } from "zod";

import { validateConsumerSetup, type ConsumerFramework } from "./validator.ts";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function json(value: unknown) {
  return text(JSON.stringify(value, null, 2));
}

function toolError(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
    isError: true,
  };
}

/**
 * Register all external consumer MCP tools for discovery, component consumption, tokens, and verification.
 */
export function registerTools(server: McpServer): void {
  // ---- Setup & Framework Guides --------------------------------------------
  server.registerTool(
    "get_setup_guide",
    {
      description:
        "Get the guide for setting up an external project to consume Mission Platform packages.",
      inputSchema: {},
    },
    () => {
      const guide = getGuide("external-setup");
      return text(guide?.body ?? "Setup guide not found.");
    },
  );

  server.registerTool(
    "get_framework_setup",
    {
      description:
        "Get framework-specific setup instructions and best practices (vue, react, solid, svelte, web-components).",
      inputSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("The target framework."),
      },
    },
    (args) => {
      const framework = args.framework;
      const guide = getGuide(`framework-${framework}`);
      return text(guide?.body ?? `Best practices for ${framework} not found.`);
    },
  );

  server.registerTool(
    "get_guide",
    {
      description:
        "Return a curated guide for Mission Platform workflows, frameworks, tokens, and routing.",
      inputSchema: {
        area: z
          .string()
          .describe(`Guide area. One of: ${GUIDE_IDS.join(", ")}`),
      },
    },
    (args) => {
      const area = args.area?.trim();
      if (!area) {
        return text(`Provide an "area". One of: ${GUIDE_IDS.join(", ")}`);
      }
      const guide = getGuide(area);
      if (!guide) {
        return text(`Unknown area "${area}". One of: ${GUIDE_IDS.join(", ")}`);
      }
      return text(guide.body);
    },
  );

  // ---- Package Discovery & Management --------------------------------------
  server.registerTool(
    "list_packages",
    {
      description:
        "List publishable Mission Platform packages for external consumers with categories and export conditions.",
      inputSchema: {
        category: z
          .enum(["all", "ui", "core", "integrations", "content", "tooling"])
          .optional()
          .describe("Filter by package category."),
        filter: z
          .string()
          .optional()
          .describe("Optional substring search query."),
      },
    },
    (args) => {
      try {
        const packages = listConsumerPackages({
          category: args.category as ConsumerPackageCategory | undefined,
          filter: args.filter,
        });
        return json(packages);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_package_info",
    {
      description:
        "Get detailed installation commands, peer dependencies, and quickstart examples for a package.",
      inputSchema: {
        packageName: z
          .string()
          .describe(
            'Package name (e.g. "@mission-platform/components", "tokens", "router").',
          ),
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .optional()
          .describe(
            "Target framework for framework-specific snippet and peer dependencies.",
          ),
      },
    },
    (args) => {
      try {
        const info = getConsumerPackageInfo(args.packageName, args.framework);
        if (!info) {
          return text(`Package "${args.packageName}" not found.`);
        }
        return json(info);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Component Exploration -----------------------------------------------
  server.registerTool(
    "list_components",
    {
      description:
        "List available components in @mission-platform/components with atomic-design level (atoms/molecules/organisms/templates/pages).",
      inputSchema: {
        filter: z
          .string()
          .optional()
          .describe("Optional substring to filter component slugs or levels."),
      },
    },
    (args) => {
      const filter = args.filter?.trim().toLowerCase();
      const components = listComponents().filter(
        (component) =>
          !filter ||
          component.slug.includes(filter) ||
          component.level.includes(filter) ||
          component.relativePath.includes(filter),
      );
      return json(components);
    },
  );

  server.registerTool(
    "get_component_usage",
    {
      description:
        "Get detailed usage information for a component, including props and framework-specific imports.",
      inputSchema: {
        component: z
          .string()
          .describe('Component name or slug, e.g. "ForgeButton".'),
      },
    },
    (args) => {
      const component = args.component?.trim();
      if (!component) return text("Provide a component name.");
      const usage = getComponentUsage(component);
      if (!usage) return text(`Component "${component}" not found.`);

      const sections = [
        `# ${usage.componentName}`,
        `Slug: ${usage.slug}`,
        `Level: ${usage.level}`,
        `Path: src/components/${usage.relativePath}`,
        "",
        "## Import",
        "One specifier for every framework - the framework build is selected by your",
        "app's export conditions (Vite `resolve.conditions` / TypeScript `customConditions`),",
        "never by the specifier:",
        "```ts",
        usage.importStatement,
        "```",
        "",
        "Per-component deep import (only this component's chunk, same conditions):",
        "```ts",
        usage.deepImport,
        "```",
      ];
      if (usage.docComment)
        sections.push("", "## Description", usage.docComment);
      if (usage.propsInterface)
        sections.push("", "## Props", "```ts", usage.propsInterface, "```");

      return text(sections.join("\n"));
    },
  );

  server.registerTool(
    "get_component_stories",
    {
      description:
        "Inspect Storybook stories, available variants, sizes, and story metadata for a component in @mission-platform/components.",
      inputSchema: {
        component: z
          .string()
          .describe('Component name or slug (e.g. "ForgeButton", "button").'),
      },
    },
    (args) => {
      try {
        const stories = getComponentStories(args.component);
        if (!stories) {
          return text(`Stories for component "${args.component}" not found.`);
        }
        return json(stories);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Icon Exploration ----------------------------------------------------
  server.registerTool(
    "list_icons",
    {
      description:
        "List available SVG icons in @mission-platform/icons with category, subcategory, and component name.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Filter by category or subcategory (e.g. "status/feedback", "navigation/controls").',
          ),
        filter: z
          .string()
          .optional()
          .describe("Optional substring to filter icon name or component."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Max icons to return (default 100)."),
      },
    },
    (args) => {
      try {
        const result = listIcons({
          category: args.category,
          filter: args.filter,
          limit: args.limit,
        });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_icon_usage",
    {
      description:
        "Get detailed import snippets, size options, color, and accessibility usage for an icon in @mission-platform/icons.",
      inputSchema: {
        icon: z
          .string()
          .describe(
            'Icon name or component name (e.g. "forge-icon-bell", "ForgeIconBell").',
          ),
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .optional()
          .describe("Target framework for copy-paste code snippet."),
      },
    },
    (args) => {
      try {
        const usage = getIconUsage(args.icon, args.framework);
        if (!usage) {
          return text(`Icon "${args.icon}" not found.`);
        }
        return json(usage);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Routing Setup -------------------------------------------------------
  server.registerTool(
    "get_router_setup",
    {
      description:
        "Get complete router setup guidance, package installation, and copy-paste code snippets for @mission-platform/router and framework adapters.",
      inputSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("Target frontend framework."),
        history: z
          .enum(["browser", "memory"])
          .optional()
          .describe(
            'History mode (browser for standard SPA, memory for tests/prerendering). Defaults to "browser".',
          ),
      },
    },
    (args) => {
      try {
        const guide = getRouterSetup(
          args.framework as SupportedRouterFramework,
          (args.history ?? "browser") as RouterHistoryType,
        );
        return json(guide);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Consumer Setup Validator --------------------------------------------
  server.registerTool(
    "validate_consumer_setup",
    {
      description:
        "Validate external project configuration (vite.config.ts, tsconfig.json, package.json) for correct export conditions and dependencies.",
      inputSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("Target frontend framework."),
        viteConfig: z
          .string()
          .optional()
          .describe("Text contents of vite.config.ts or vite.config.js."),
        tsconfig: z
          .string()
          .optional()
          .describe("Text contents of tsconfig.json."),
        packageJson: z
          .string()
          .optional()
          .describe("Text contents of package.json."),
      },
    },
    (args) => {
      try {
        const report = validateConsumerSetup({
          framework: args.framework as ConsumerFramework,
          viteConfig: args.viteConfig,
          tsconfig: args.tsconfig,
          packageJson: args.packageJson,
        });
        return json(report);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Design Tokens & Overrides -------------------------------------------
  server.registerTool(
    "get_tokens",
    {
      description:
        "Reads Mission Platform DTCG design tokens from @mission-platform/tokens. Select a top-level category, a split component source such as component/atoms/button, or omit the filter for the complete merged document.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Optional category or normalized source ID (e.g. palette, spacing, typography, component, component/atoms/button).",
          ),
      },
    },
    (args) => {
      try {
        return json(readTokens(args.category));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_token_override_guide",
    {
      description:
        "Explains how to re-skin an app by overriding Mission Platform design tokens, using the recommended DTCG JSON -> generated SCSS workflow.",
      inputSchema: {},
    },
    () => {
      const guide = getGuide("design-token-overrides");
      return text(guide?.body ?? "Design token overrides guide not found.");
    },
  );

  server.registerTool(
    "list_token_variables",
    {
      description:
        "Lists overridable Mission Platform design-token CSS custom properties (--mp-*), stable DTCG paths, source IDs, and descriptions. Component properties use --mp-<layer>-* while overrides remain keyed by component.* paths; optionally scope to a category or split source.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Category or normalized source ID to scope to (e.g. theme-light, palette, radius, shadow, font, spacing, component/atoms/button).",
          ),
      },
    },
    (args) => {
      try {
        return json(listOverridableTokenVariables(args.category));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_token_override_schema",
    {
      description:
        "Returns the JSON Schema (Draft 2020-12) for DTCG design-token override documents. It enumerates every overridable token key defined by @mission-platform/tokens (colours, spacing, radius, shadow, typography, motion, …) so editors and agents can validate and autocomplete `*.tokens.json` override documents. Reference it from a document via a `$schema` key.",
      inputSchema: {},
    },
    () => {
      try {
        return json(readTokenOverrideSchema());
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "generate_token_override",
    {
      description:
        "Transforms a DTCG-style design-token override document into an SCSS/CSS `:root { --mp-*: ... }` partial to import after @mission-platform/tokens. A `{ light, dark }` value becomes `light-dark(...)`; any other scalar is emitted verbatim. Override keys are validated against the known @mission-platform/tokens variables; unknown keys are reported as a non-fatal warning.",
      inputSchema: {
        tokens: z
          .string()
          .describe(
            'The override document as a JSON string, e.g. {"color":{"primary":{"default":{"$value":{"light":"#8b7ff0","dark":"#a99cf5"}}}},"radius":{"md":{"$value":"2px"}}}.',
          ),
        prefix: z
          .string()
          .optional()
          .describe("Custom-property prefix (defaults to `mp`)."),
      },
    },
    (args) => {
      try {
        const document = JSON.parse(args.tokens) as OverrideGroup;
        const scss = buildTokenOverrideScss(document, { prefix: args.prefix });
        const { unknownKeys } = validateOverrideDocument(document, args.prefix);
        if (unknownKeys.length === 0) return text(scss);
        const warning = [
          `/* WARNING: ${unknownKeys.length} override key(s) don't match any known`,
          "   @mission-platform/tokens variable (possible typos or app-specific tokens):",
          ...unknownKeys.map((name) => `     ${name}`),
          "   Use get_token_override_schema or list_token_variables to see valid keys. */",
        ].join("\n");
        return text(`${warning}\n\n${scss}`);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return toolError(`Invalid JSON: ${error.message}`);
        }
        return toolError(error);
      }
    },
  );
}
