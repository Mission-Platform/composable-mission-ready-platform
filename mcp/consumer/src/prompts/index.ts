/**
 * Prompt workflows for `@mission-platform/mcp-consumer`.
 *
 * Guiding AI assistants and external developers through setting up external apps,
 * importing and configuring components, managing tokens, and setting up routing.
 */
import { z } from "zod";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "consumer-setup",
    {
      description:
        "Step-by-step guidance to configure an external application to consume Mission Platform packages.",
      argsSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("Target frontend framework."),
      },
    },
    async (args) => {
      const framework = args.framework;
      const conditionMap: Record<string, string> = {
        vue: "mp:vue",
        react: "mp:react",
        solid: "mp:solid",
        svelte: "mp:svelte",
        "web-components": "mp:web-component",
      };
      const condition = conditionMap[framework] ?? "mp:web-component";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to set up an external application using ${framework} to consume Mission Platform packages (@mission-platform/components, @mission-platform/tokens, @mission-platform/icons).

Please guide me through:
1. Installing the required packages and peer dependencies for ${framework}.
2. Configuring Vite resolve.conditions with "${condition}".
3. Configuring TypeScript customConditions with "${condition}".
4. Importing design tokens in the root stylesheet (tokens.css).
5. Verifying the configuration using the "validate_consumer_setup" tool.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "consume-component",
    {
      description:
        "Select, import, configure, and render a Mission Platform component in a consumer application.",
      argsSchema: {
        component: z
          .string()
          .describe(
            'Component name or purpose (e.g. "button", "modal", "table").',
          ),
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .optional()
          .describe("Consumer frontend framework."),
      },
    },
    async (args) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to use the "${args.component}" component in my ${args.framework ? `${args.framework} ` : ""}application.

Please:
1. Query "get_component_usage" and "get_component_stories" for "${args.component}".
2. Explain the available variants, sizes, and states (disabled, loading).
3. Provide a complete, idiomatic code snippet for importing and rendering the component${args.framework ? ` in ${args.framework}` : ""}.
4. Explain how to customize its appearance using DTCG design tokens.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "override-tokens",
    {
      description:
        "Walk through creating a Design Tokens Community Group (DTCG) override file and generating CSS variables.",
      argsSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Token category to customize (e.g. "palette", "spacing", "radius").',
          ),
      },
    },
    async (args) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to customize Mission Platform design tokens${args.category ? ` for category "${args.category}"` : ""}.

Please:
1. Query "list_token_variables" and "get_tokens" to inspect the base tokens.
2. Guide me in authoring a DTCG-compliant tokens override document.
3. Use "generate_token_override" to produce compiled CSS variables.
4. Show how to import the compiled CSS overrides at the application root (:root).`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "routing-setup",
    {
      description:
        "Configure framework-neutral routing with native framework adapters and async loading fallbacks.",
      argsSchema: {
        framework: z
          .enum(["vue", "react", "solid", "svelte", "web-components"])
          .describe("Target frontend framework."),
      },
    },
    async (args) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to set up routing in my ${args.framework} application using @mission-platform/router.

Please:
1. Query "get_router_setup" for "${args.framework}".
2. Explain the difference between browser history and memory history.
3. Show how to define routes, dynamic path parameters, and redirects.
4. Show how to configure the outlet with a loadingFallback spinner for async views.
5. Provide navigation examples using ForgeRouterLink.`,
            },
          },
        ],
      };
    },
  );
}
