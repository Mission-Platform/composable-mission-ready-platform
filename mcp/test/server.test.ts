/**
 * Tests for the Mission Platform MCP server core, run with Node's built-in test
 * runner (`node --test`). No external dependencies required.
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { createServer } from '../src/index.ts';
import { validateName } from '../src/scaffold/writer.ts';

import type { JsonRpcRequest, JsonRpcSuccess } from '../src/protocol/types.ts';

const server = createServer();

let nextId = 0;
async function call(method: string, parameters?: Record<string, unknown>): Promise<JsonRpcSuccess> {
  const request: JsonRpcRequest = { jsonrpc: '2.0', id: (nextId += 1), method, params: parameters };
  const response = await server.handle(request);
  assert.ok(response, `expected a response for ${method}`);
  assert.ok('result' in response, `expected a success result for ${method}, got ${JSON.stringify(response)}`);
  return response as JsonRpcSuccess;
}

async function callTool(name: string, arguments_: Record<string, unknown> = {}): Promise<string> {
  const response = await call('tools/call', { name, arguments: arguments_ });
  const result = response.result as { content: { type: string; text: string }[]; isError?: boolean };
  return result.content.map((entry) => entry.text).join('\n');
}

describe('protocol', () => {
  it('initializes with a protocol version and server info', async () => {
    const { result } = await call('initialize');
    const typed = result as { protocolVersion: string; serverInfo: { name: string } };
    assert.equal(typeof typed.protocolVersion, 'string');
    assert.equal(typed.serverInfo.name, 'mission-platform-mcp');
  });

  it('treats notifications as fire-and-forget', async () => {
    const response = await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.equal(response, null);
  });

  it('returns an error for unknown methods', async () => {
    const response = await server.handle({ jsonrpc: '2.0', id: 99, method: 'does/not/exist' });
    assert.ok(response && 'error' in response);
  });
});

describe('tools', () => {
  it('lists the expected tools', async () => {
    const { result } = await call('tools/list');
    const names = new Set((result as { tools: { name: string }[] }).tools.map((tool) => tool.name));
    for (const expected of [
      'get_guide',
      'list_components',
      'get_component_usage',
      'list_packages',
      'list_apps',
      'list_workers',
      'scaffold_package',
      'scaffold_app',
      'scaffold_worker',
    ]) {
      assert.ok(names.has(expected), `missing tool ${expected}`);
    }
  });

  it('returns a guide for every workflow area', async () => {
    const body = await callTool('get_guide', { area: 'package-creation' });
    assert.match(body, /Creating a Package/);
  });

  it('lists components from the components package', async () => {
    const body = await callTool('list_components');
    assert.match(body, /base-button/);
  });

  it('describes a component with its props and imports', async () => {
    const body = await callTool('get_component_usage', { component: 'BaseButton' });
    assert.match(body, /@mission-platform\/components\/vue/);
    assert.match(body, /ButtonProperties|Props/);
  });

  it('lists packages, apps and workers', async () => {
    assert.match(await callTool('list_packages'), /@mission-platform\/components/);
    assert.match(await callTool('list_workers'), /@mission-platform\/base-spa/);
    assert.match(await callTool('list_apps'), /@mission-platform\/my-care-notes/);
  });

  it('scaffolds a package as a dry run without writing files', async () => {
    const body = await callTool('scaffold_package', { name: 'mcp-sample-pkg', description: 'x' });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.includes('package.json'));
    assert.ok(result.files.includes('src/index.ts'));
  });

  it('reports a tool error for an invalid scaffold name', async () => {
    const response = await call('tools/call', { name: 'scaffold_worker', arguments: { name: 'Bad Name' } });
    const result = response.result as { isError?: boolean; content: { text: string }[] };
    assert.equal(result.isError, true);
    assert.match(result.content[0]?.text ?? '', /Invalid name/);
  });
});

describe('resources', () => {
  it('lists guide, inventory and docs resources', async () => {
    const { result } = await call('resources/list');
    const uris = (result as { resources: { uri: string }[] }).resources.map((resource) => resource.uri);
    assert.ok(uris.includes('mission://guide/overview'));
    assert.ok(uris.includes('mission://inventory'));
    assert.ok(uris.some((uri) => uri.startsWith('mission://docs/')));
  });

  it('reads a guide resource', async () => {
    const { result } = await call('resources/read', { uri: 'mission://guide/conventions' });
    const contents = (result as { contents: { text: string }[] }).contents;
    assert.match(contents[0]?.text ?? '', /Conventions/);
  });
});

describe('prompts', () => {
  it('lists the workflow prompts', async () => {
    const { result } = await call('prompts/list');
    const names = new Set((result as { prompts: { name: string }[] }).prompts.map((prompt) => prompt.name));
    for (const expected of ['use-component', 'create-package', 'develop-package', 'create-app', 'create-worker']) {
      assert.ok(names.has(expected), `missing prompt ${expected}`);
    }
  });

  it('builds a create-package prompt with the name substituted', async () => {
    const { result } = await call('prompts/get', {
      name: 'create-package',
      arguments: { name: 'demo-utils', purpose: 'Demo.' },
    });
    const messages = (result as { messages: { content: { text: string } }[] }).messages;
    assert.match(messages[0]?.content.text ?? '', /@mission-platform\/demo-utils/);
  });
});

describe('validateName', () => {
  it('accepts kebab-case names', () => {
    assert.equal(validateName('date-utils'), undefined);
  });
  it('rejects invalid names', () => {
    assert.ok(validateName('Bad Name'));
    assert.ok(validateName('-leading'));
  });
});

after(() => {
  // Nothing to clean up: the server holds no open handles.
});
