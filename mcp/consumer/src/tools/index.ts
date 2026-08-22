/**
 * Tool definitions for the CONSUMER MCP server.
 * Focuses on external project setup and component consumption.
 */

import { getGuide } from "@mission-platform/mcp-shared/knowledge/guides";
import {
  getComponentUsage,
  listComponents,
} from "@mission-platform/mcp-shared/repo/components";
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

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function json(value: unknown) {
  return text(JSON.stringify(value, null, 2));
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "get_setup_guide",
    {
      description:
        "Get the guide for setting up an external project to consume Mission Platform packages.",
      inputSchema: {},
    },
    async () => {
      const guide = getGuide("external-setup");
      return text(guide?.body ?? "Setup guide not found.");
    },
  );

  server.registerTool(
    "get_framework_setup",
    {
      description:
        "Get framework-specific setup instructions and best practices.",
      inputSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("The target framework."),
      },
    },
    async (args) => {
      const framework = args.framework;
      const guide = getGuide(`framework-${framework}`);
      return text(guide?.body ?? `Best practices for ${framework} not found.`);
    },
  );

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
    async (args) => {
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
    async (args) => {
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
    async (args) => {
      try {
        return json(readTokens(args.category));
      } catch (error) {
        return text(error instanceof Error ? error.message : String(error));
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
    async () => {
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
    async (args) => {
      try {
        return json(listOverridableTokenVariables(args.category));
      } catch (error) {
        return text(error instanceof Error ? error.message : String(error));
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
    async () => {
      try {
        return json(readTokenOverrideSchema());
      } catch (error) {
        return text(error instanceof Error ? error.message : String(error));
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
    async (args) => {
      let document: OverrideGroup;
      try {
        document = JSON.parse(args.tokens) as OverrideGroup;
      } catch (error) {
        return text(
          `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const scss = buildTokenOverrideScss(document, { prefix: args.prefix });
      const { unknownKeys } = validateOverrideDocument(document, args.prefix);
      if (unknownKeys.length === 0) return text(scss);
      const warning = [
        `/* WARNING: ${unknownKeys.length} override key(s) don't match any known`,
        `   @mission-platform/tokens variable (possible typos or app-specific tokens):`,
        ...unknownKeys.map((name) => `     ${name}`),
        `   Use get_token_override_schema or list_token_variables to see valid keys. */`,
      ].join("\n");
      return text(`${warning}\n\n${scss}`);
    },
  );
}
