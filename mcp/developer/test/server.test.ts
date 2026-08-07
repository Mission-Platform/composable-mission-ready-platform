/**
 * Tests for the Mission Platform MCP server core using `@modelcontextprotocol/sdk`,
 * run with Node's built-in test runner (`node --test`).
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/index.ts';
import { validateName } from '../src/scaffold/writer.ts';

let client: Client;

before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);

  client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
});

async function callTool(name: string, arguments_: Record<string, unknown> = {}): Promise<string> {
  const result = await client.callTool({ name, arguments: arguments_ });
  const content = result.content as { type: string; text: string }[];
  return content.map((entry) => entry.text).join('\n');
}

describe('protocol', () => {
  it('initializes and connects', () => {
    assert.ok(client);
  });
});

describe('tools', () => {
  it('lists the expected tools', async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
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
      'scaffold_crate',
      'scaffold_component',
      'scaffold_composable',
      'scaffold_store',
      'scaffold_util',
      'list_locales',
      'add_locale',
      'remove_locale',
      'update_translation',
    ]) {
      assert.ok(names.has(expected), `missing tool ${expected}`);
    }
  });

  it('returns a guide for every workflow area', async () => {
    const body = await callTool('get_guide', { area: 'package-creation' });
    assert.match(body, /Creating a Package/);
  });

  it('returns the atomic component design guide', async () => {
    const body = await callTool('get_guide', { area: 'atomic-component-design' });
    assert.match(body, /Atomic Component Design/);
    assert.match(body, /Atoms\/Forms\/ForgeInput/);
  });

  it('lists components from the components package with atomic level', async () => {
    const body = await callTool('list_components');
    assert.match(body, /forge-button/);
    assert.match(body, /"level": "atoms"/);
  });

  it('describes a component with its props and imports', async () => {
    const body = await callTool('get_component_usage', { component: 'ForgeButton' });
    // One framework-agnostic specifier: the build is chosen by the consumer's
    // `mp:<framework>` condition, so no per-framework subpath is ever suggested.
    assert.match(body, /from '@mission-platform\/components'/);
    assert.doesNotMatch(body, /@mission-platform\/components\/(vue|react|solid|svelte|web-components)/);
    assert.match(body, /ButtonProperties|Props/);
    assert.match(body, /Level: atoms/);
  });

  it('lists packages, apps and workers', async () => {
    assert.match(await callTool('list_packages'), /@mission-platform\/components/);
    assert.match(await callTool('list_workers'), /@mission-platform\/forge-spa/);
    assert.match(await callTool('list_apps'), /@mission-platform\/my-care-notes/);
  });

  it('scaffolds a package as a dry run without writing files', async () => {
    const body = await callTool('scaffold_package', { name: 'mcp-sample-pkg', description: 'x' });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.includes('package.json'));
    assert.ok(result.files.includes('src/index.ts'));
  });

  it('scaffolds a crate as a dry run without writing files', async () => {
    const body = await callTool('scaffold_crate', { name: 'mcp-sample-crate', description: 'Sample crate' });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.includes('Cargo.toml'));
    assert.ok(result.files.includes('src/lib.rs'));
    assert.ok(result.files.includes('build.rs'));
    assert.ok(result.files.includes('tests/wasm.rs'));
  });

  it('scaffolds a component as a dry run without writing files', async () => {
    const body = await callTool('scaffold_component', {
      name: 'forge-mcp-probe',
      level: 'atom',
      area: 'Forms',
    });
    const result = JSON.parse(body) as {
      applied: boolean;
      files: string[];
      storyTitle: string;
      levelFolder: string;
    };
    assert.equal(result.applied, false);
    assert.equal(result.levelFolder, 'atoms');
    assert.equal(result.storyTitle, 'Atoms/Forms/ForgeMcpProbe');
    assert.ok(result.files.some((file) => file.endsWith('forge-mcp-probe.tsx')));
    assert.ok(result.files.some((file) => file.endsWith('forge-mcp-probe.stories.tsx')));
    assert.ok(result.files.some((file) => file.endsWith('forge-mcp-probe.spec.ts')));
  });

  it('scaffolds a composable as a dry run without writing files', async () => {
    const body = await callTool('scaffold_composable', {
      name: 'focus-trap',
      package: 'observers',
    });
    const result = JSON.parse(body) as { applied: boolean; files: string[]; name: string; functionName: string };
    assert.equal(result.applied, false);
    assert.equal(result.name, 'use-focus-trap');
    assert.equal(result.functionName, 'useFocusTrap');
    assert.ok(result.files.some((file) => file.includes('src/composables/use-focus-trap/')));
  });

  it('scaffolds a store as a dry run without writing files', async () => {
    const body = await callTool('scaffold_store', {
      name: 'mcp-probe',
      package: 'components',
    });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.some((file) => file.includes('src/stores/mcp-probe/')));
  });

  it('scaffolds a util as a dry run without writing files', async () => {
    const body = await callTool('scaffold_util', {
      name: 'mcp-probe-util',
      package: 'd3',
    });
    const result = JSON.parse(body) as { applied: boolean; files: string[]; functionName: string };
    assert.equal(result.applied, false);
    assert.equal(result.functionName, 'mcpProbeUtil');
    assert.ok(result.files.some((file) => file.includes('src/utils/mcp-probe-util/')));
  });

  it('surveys locales across apps and details a single member', async () => {
    const survey = JSON.parse(await callTool('list_locales')) as { name: string; layout: string; locales: string[] }[];
    const website = survey.find((entry) => entry.name === 'website');
    assert.ok(website, 'website should appear in the locale survey');
    assert.equal(website?.layout, 'nested');
    assert.ok(website?.locales.includes('en'));

    const detail = JSON.parse(await callTool('list_locales', { name: 'website' })) as {
      layout: string;
      defaultLocale: string;
      locales: string[];
      coverage: { code: string; keyCount: number }[];
    };
    assert.equal(detail.layout, 'nested');
    assert.equal(detail.defaultLocale, 'en');
    assert.ok(detail.locales.includes('es'));
    assert.ok(detail.coverage.every((entry) => entry.code !== 'en'));
  });

  it('adds a locale as a dry run without writing files', async () => {
    const body = await callTool('add_locale', { name: 'website', locale: 'pt' });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.some((file) => file.includes('/pt/')));
  });

  it('removes a locale as a dry run without deleting files', async () => {
    const body = await callTool('remove_locale', { name: 'website', locale: 'ko' });
    const result = JSON.parse(body) as { applied: boolean; files: string[] };
    assert.equal(result.applied, false);
    assert.ok(result.files.some((file) => file.includes('ko')));
  });

  it('updates a translation as a dry run without writing files', async () => {
    const body = await callTool('update_translation', {
      name: 'website',
      locale: 'es',
      entries: { 'nav.about': 'Acerca de' },
    });
    const result = JSON.parse(body) as { applied: boolean; updatedKeys: string[] };
    assert.equal(result.applied, false);
    assert.deepEqual(result.updatedKeys, ['nav.about']);
  });

  it('refuses to add the default locale', async () => {
    const result = await client.callTool({ name: 'add_locale', arguments: { name: 'website', locale: 'en' } });
    assert.equal(result.isError, true);
  });

  it('refuses to remove the default locale', async () => {
    const result = await client.callTool({ name: 'remove_locale', arguments: { name: 'website', locale: 'en' } });
    assert.equal(result.isError, true);
  });

  it('reports a tool error for an invalid scaffold name', async () => {
    const result = await client.callTool({ name: 'scaffold_worker', arguments: { name: 'Bad Name' } });
    assert.equal(result.isError, true);
    const content = result.content as { text: string }[];
    assert.match(content[0]?.text ?? '', /Invalid name/);
  });
});

describe('resources', () => {
  it('lists guide, inventory and docs resources', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((resource) => resource.uri);
    assert.ok(uris.includes('mission://guide/overview'));
    assert.ok(uris.includes('mission://inventory'));
    assert.ok(uris.some((uri) => uri.startsWith('mission://docs/')));
  });

  it('reads a guide resource', async () => {
    const { contents } = await client.readResource({ uri: 'mission://guide/conventions' });
    const typed = contents as { text: string }[];
    assert.match(typed[0]?.text ?? '', /Conventions/);
  });
});

describe('prompts', () => {
  it('lists the workflow prompts', async () => {
    const { prompts } = await client.listPrompts();
    const names = new Set(prompts.map((prompt) => prompt.name));
    for (const expected of ['use-component', 'create-package', 'develop-package', 'create-app', 'create-worker']) {
      assert.ok(names.has(expected), `missing prompt ${expected}`);
    }
  });

  it('builds a create-package prompt with the name substituted', async () => {
    const result = await client.getPrompt({
      name: 'create-package',
      arguments: { name: 'demo-utils', purpose: 'Demo.' },
    });
    const messages = result.messages as { content: { text: string } }[];
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

after(async () => {
  await client.close();
});
