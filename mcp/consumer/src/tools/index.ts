/**
 * Tool definitions for the CONSUMER MCP server.
 * Focuses on external project setup and component consumption.
 */

import { getGuide } from "@mission-platform/mcp-shared/knowledge/guides";
import {
  getComponentUsage,
  listComponents,
} from "@mission-platform/mcp-shared/repo/components";
import { readTokens } from "@mission-platform/mcp-shared/repo/tokens";
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
          .describe('Component name or slug, e.g. "BaseButton".'),
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
        "Recommended (with framework conditions):",
        "```ts",
        `import { ${usage.componentName} } from '@mission-platform/components';`,
        "```",
        "",
        "Framework-specific fallbacks:",
        "```ts",
        `// Vue\n${usage.vueImport}`,
        `// React\n${usage.reactImport}`,
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
        "reads Mission Platform design tokens (optionally one category) from @mission-platform/tokens.",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Token category (e.g. palette, spacing, typography)."),
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
}
