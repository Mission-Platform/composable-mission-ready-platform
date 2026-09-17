/**
 * Consumer MCP server integration tests using the SDK's in-memory transport.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../src/index.ts";

let client: Client;

before(async () => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);

  client = new Client({ name: "consumer-test-client", version: "1.0.0" });
  await client.connect(clientTransport);
});

async function callTool(
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<{ body: string; isError?: boolean }> {
  const result = await client.callTool({ name, arguments: arguments_ });
  const content = result.content as { type: string; text: string }[];
  return {
    body: content.map((entry) => entry.text).join("\n"),
    isError: typeof result.isError === "boolean" ? result.isError : undefined,
  };
}

describe("consumer tool catalog", () => {
  it("lists all registered consumer tools", async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    const expectedTools = [
      "get_setup_guide",
      "get_framework_setup",
      "get_guide",
      "list_packages",
      "get_package_info",
      "list_components",
      "get_component_usage",
      "get_component_stories",
      "list_icons",
      "get_icon_usage",
      "get_router_setup",
      "validate_consumer_setup",
      "get_tokens",
      "get_token_override_guide",
      "list_token_variables",
      "get_token_override_schema",
      "generate_token_override",
    ];

    for (const expected of expectedTools) {
      assert.ok(names.has(expected), `missing tool ${expected}`);
    }
  });

  it("lists consumer workflow prompts", async () => {
    const { prompts } = await client.listPrompts();
    const promptNames = new Set(prompts.map((p) => p.name));
    assert.ok(promptNames.has("consumer-setup"));
    assert.ok(promptNames.has("consume-component"));
    assert.ok(promptNames.has("override-tokens"));
    assert.ok(promptNames.has("routing-setup"));
  });
});

describe("consumer framework and setup guides", () => {
  it("returns Svelte framework setup without error", async () => {
    const result = await callTool("get_framework_setup", {
      framework: "svelte",
    });
    assert.equal(result.isError, undefined);
    assert.match(result.body, /Svelte Best Practices/);
    assert.match(result.body, /mp:svelte/);
  });

  it("retrieves arbitrary curated guides via get_guide", async () => {
    const result = await callTool("get_guide", { area: "routing-setup" });
    assert.equal(result.isError, undefined);
    assert.match(result.body, /Framework-Neutral Routing/);
    assert.match(result.body, /forge-router-outlet/);
  });

  it("returns helpful error message for unknown guide area", async () => {
    const result = await callTool("get_guide", { area: "non-existent-area" });
    assert.equal(result.isError, undefined);
    assert.match(result.body, /Unknown area "non-existent-area"/);
  });
});

describe("package discovery and inspection", () => {
  it("lists consumer packages and supports category filtering", async () => {
    const all = await callTool("list_packages");
    assert.equal(all.isError, undefined);
    const parsedAll = JSON.parse(all.body) as Array<{
      name: string;
      category: string;
    }>;
    assert.ok(parsedAll.length > 5);

    const uiOnly = await callTool("list_packages", { category: "ui" });
    assert.equal(uiOnly.isError, undefined);
    const parsedUi = JSON.parse(uiOnly.body) as Array<{
      name: string;
      category: string;
    }>;
    assert.ok(parsedUi.length > 0);
    assert.ok(parsedUi.every((pkg) => pkg.category === "ui"));
  });

  it("returns package info, install commands, and import snippets", async () => {
    const result = await callTool("get_package_info", {
      packageName: "@mission-platform/components",
      framework: "vue",
    });
    assert.equal(result.isError, undefined);
    const info = JSON.parse(result.body) as {
      name: string;
      installCommands: { pnpm: string };
      exportConditions: string[];
      quickStartSnippet: string;
    };
    assert.equal(info.name, "@mission-platform/components");
    assert.equal(
      info.installCommands.pnpm,
      "pnpm add @mission-platform/components",
    );
    assert.ok(info.exportConditions.includes("mp:vue"));
    assert.match(info.quickStartSnippet, /ForgeButton/);
  });
});

describe("icon discovery and usage", () => {
  it("lists available icons and filters by category", async () => {
    const result = await callTool("list_icons", {
      category: "status/feedback",
    });
    assert.equal(result.isError, undefined);
    const parsed = JSON.parse(result.body) as {
      icons: Array<{ name: string; componentName: string }>;
      total: number;
    };
    assert.ok(parsed.icons.length > 0);
    assert.ok(parsed.icons.some((icon) => icon.name === "forge-icon-alert"));
  });

  it("provides icon usage properties and framework code examples", async () => {
    const result = await callTool("get_icon_usage", {
      icon: "forge-icon-bell",
      framework: "react",
    });
    assert.equal(result.isError, undefined);
    const usage = JSON.parse(result.body) as {
      componentName: string;
      importStatement: string;
      examples: Record<string, string>;
    };
    assert.equal(usage.componentName, "ForgeIconBell");
    assert.match(usage.importStatement, /@mission-platform\/icons/);
    assert.match(usage.examples.react ?? "", /ForgeIconBell/);
  });
});

describe("component stories exploration", () => {
  it("extracts story details and variants for ForgeButton", async () => {
    const result = await callTool("get_component_stories", {
      component: "ForgeButton",
    });
    assert.equal(result.isError, undefined);
    const detail = JSON.parse(result.body) as {
      componentName: string;
      storyNames: string[];
      variants: string[];
      sizes: string[];
    };
    assert.equal(detail.componentName, "ForgeButton");
    assert.ok(detail.storyNames.includes("Primary"));
    assert.ok(detail.variants.includes("primary"));
    assert.ok(detail.sizes.includes("md"));
  });
});

describe("router setup assistance", () => {
  it("generates copy-paste router setup for Vue with browser history", async () => {
    const result = await callTool("get_router_setup", {
      framework: "vue",
      history: "browser",
    });
    assert.equal(result.isError, undefined);
    const guide = JSON.parse(result.body) as {
      framework: string;
      packages: string[];
      setupSnippet: string;
      outletUsageSnippet: string;
    };
    assert.equal(guide.framework, "vue");
    assert.ok(guide.packages.includes("@mission-platform/router"));
    assert.match(guide.setupSnippet, /createVueRouter/);
    assert.match(guide.setupSnippet, /MpBrowserHistory/);
    assert.match(guide.outletUsageSnippet, /<ForgeRouterOutlet \/>/);
  });
});

describe("consumer setup validator", () => {
  it("validates a correct Vite + TypeScript + package.json setup", async () => {
    const result = await callTool("validate_consumer_setup", {
      framework: "vue",
      viteConfig: `
        import { defineConfig } from 'vite';
        export default defineConfig({
          resolve: { conditions: ['mp:vue', 'import'] }
        });
      `,
      tsconfig: JSON.stringify({
        compilerOptions: {
          customConditions: ["mp:vue"],
          moduleResolution: "bundler",
        },
      }),
      packageJson: JSON.stringify({
        dependencies: {
          vue: "^3.5.0",
          "@mission-platform/components": "^1.0.0",
          "@mission-platform/tokens": "^1.0.0",
        },
        devDependencies: {
          "@vitejs/plugin-vue": "^5.0.0",
        },
      }),
    });

    assert.equal(result.isError, undefined);
    const report = JSON.parse(result.body) as {
      status: string;
      passedChecks: number;
      failedChecks: number;
    };
    assert.equal(report.status, "valid");
    assert.equal(report.failedChecks, 0);
    assert.ok(report.passedChecks >= 3);
  });

  it("detects missing export conditions and missing peer dependencies", async () => {
    const result = await callTool("validate_consumer_setup", {
      framework: "vue",
      viteConfig: `export default defineConfig({});`,
      tsconfig: JSON.stringify({
        compilerOptions: {
          moduleResolution: "bundler",
        },
      }),
      packageJson: JSON.stringify({
        dependencies: {},
      }),
    });

    assert.equal(result.isError, undefined);
    const report = JSON.parse(result.body) as {
      status: string;
      failedChecks: number;
      checks: Array<{ name: string; status: string }>;
    };
    assert.equal(report.status, "errors");
    assert.ok(report.failedChecks >= 2);
    assert.ok(
      report.checks.some((c) => c.status === "fail" && c.name.includes("Vite")),
    );
  });

  it("flags conflicting export conditions", async () => {
    const result = await callTool("validate_consumer_setup", {
      framework: "vue",
      viteConfig: `
        export default defineConfig({
          resolve: { conditions: ['mp:react'] }
        });
      `,
    });

    assert.equal(result.isError, undefined);
    const report = JSON.parse(result.body) as {
      status: string;
      failedChecks: number;
      checks: Array<{ name: string; status: string }>;
    };
    assert.equal(report.status, "errors");
    assert.ok(
      report.checks.some(
        (c) => c.status === "fail" && c.name.includes("Conflicting"),
      ),
    );
  });
});

describe("consumer token tools", () => {
  it("returns tokens, variables, schema, and generated overrides successfully", async () => {
    const tokens = await callTool("get_tokens", { category: "radius" });
    assert.equal(tokens.isError, undefined);
    assert.equal(JSON.parse(tokens.body).radius.md.$value, "0.429rem");

    const variables = await callTool("list_token_variables", {
      category: "radius",
    });
    assert.equal(variables.isError, undefined);
    assert.ok(
      JSON.parse(variables.body).some(
        (entry: { name: string }) => entry.name === "--mp-radius-md",
      ),
    );

    const schema = await callTool("get_token_override_schema");
    assert.equal(schema.isError, undefined);
    assert.equal(
      JSON.parse(schema.body).$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );

    const generated = await callTool("generate_token_override", {
      tokens: JSON.stringify({ radius: { md: { $value: "2px" } } }),
    });
    assert.equal(generated.isError, undefined);
    assert.match(generated.body, /--mp-radius-md: 2px;/);
  });

  it("keeps ordinary component not-found guidance as a successful response", async () => {
    const result = await callTool("get_component_usage", {
      component: "does-not-exist",
    });
    assert.equal(result.isError, undefined);
    assert.equal(result.body, 'Component "does-not-exist" not found.');
  });

  it("reports invalid token categories as MCP tool errors", async () => {
    const tokens = await callTool("get_tokens", { category: "does-not-exist" });
    assert.equal(tokens.isError, true);
    assert.match(tokens.body, /not found/);

    const variables = await callTool("list_token_variables", {
      category: "does-not-exist",
    });
    assert.equal(variables.isError, true);
    assert.match(variables.body, /not found/);
  });

  it("reports malformed JSON and invalid override documents as MCP tool errors", async () => {
    const malformedJson = await callTool("generate_token_override", {
      tokens: "{",
    });
    assert.equal(malformedJson.isError, true);
    assert.match(malformedJson.body, /^Invalid JSON:/);

    const malformedDocument = await callTool("generate_token_override", {
      tokens: JSON.stringify({ radius: { md: { $value: { light: "2px" } } } }),
    });
    assert.equal(malformedDocument.isError, true);
    assert.match(malformedDocument.body, /Invalid token override/);

    const injectedValue = await callTool("generate_token_override", {
      tokens: JSON.stringify({ radius: { md: { $value: "2px; color: red" } } }),
    });
    assert.equal(injectedValue.isError, true);
    assert.match(
      injectedValue.body,
      /CSS comment, block, or declaration delimiter/,
    );
  });
});

after(async () => {
  await client.close();
});
