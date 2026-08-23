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

describe("consumer protocol", () => {
  it("lists the consumer token tools", async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    for (const expected of [
      "get_tokens",
      "list_token_variables",
      "get_token_override_schema",
      "generate_token_override",
    ]) {
      assert.ok(names.has(expected), `missing tool ${expected}`);
    }
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
