/**
 * Tests for MCP server profiles, polymorphic dispatchers, and workspace task tools.
 * Run with Node's built-in test runner (`node --test`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/index.ts';

async function createConnectedClient(options: Parameters<typeof createServer>[0] = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(options);
  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  return client;
}

async function callTool(client: Client, name: string, arguments_: Record<string, unknown> = {}): Promise<string> {
  const result = await client.callTool({ name, arguments: arguments_ });
  const content = result.content as { type: string; text: string }[];
  return content.map((entry) => entry.text).join('\n');
}

describe('MCP Profiles & Surface Area Scoping', () => {
  it('scopes tools to core profile (~10 tools)', async () => {
    const client = await createConnectedClient({ profile: 'core' });
    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((t) => t.name));

    // Core tools must be present
    assert.ok(toolNames.has('review_changes'));
    assert.ok(toolNames.has('list_components'));
    assert.ok(toolNames.has('get_component_usage'));
    assert.ok(toolNames.has('security_scan_secrets'));
    assert.ok(toolNames.has('lsp_get_diagnostics'));
    assert.ok(toolNames.has('git_status'));
    assert.ok(toolNames.has('git_changed_files'));
    assert.ok(toolNames.has('git_diff'));
    assert.ok(toolNames.has('repo_affected_packages'));

    // Non-core tools must be omitted to conserve tokens
    assert.equal(toolNames.has('flint_run_trace'), false);
    assert.equal(toolNames.has('scaffold_crate'), false);
    assert.equal(toolNames.has('git_commit_apply'), false);
    assert.equal(toolNames.has('lsp_apply_edit'), false);
    assert.equal(toolNames.has('security_audit_compliance'), false);

    assert.ok(tools.length <= 15, `Expected <= 15 tools in core profile, got ${tools.length}`);
  });

  it('scopes tools to security profile', async () => {
    const client = await createConnectedClient({ profile: 'security' });
    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((t) => t.name));

    assert.ok(toolNames.has('security_scan_secrets'));
    assert.ok(toolNames.has('security_analyze_code'));
    assert.ok(toolNames.has('security_audit_dependencies'));
    assert.ok(toolNames.has('security_audit_supply_chain'));
    assert.ok(toolNames.has('security_collect_compliance_evidence'));
    assert.ok(toolNames.has('security_audit_compliance'));
    assert.ok(toolNames.has('review_changes'));

    assert.equal(toolNames.has('scaffold_component'), false);
    assert.equal(toolNames.has('git_commit_apply'), false);
    assert.equal(toolNames.has('lsp_rename'), false);
    assert.equal(tools.length, 7);
  });

  it('scopes tools to frontend profile', async () => {
    const client = await createConnectedClient({ profile: 'frontend' });
    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((t) => t.name));

    assert.ok(toolNames.has('list_components'));
    assert.ok(toolNames.has('get_component_usage'));
    assert.ok(toolNames.has('get_tokens'));
    assert.ok(toolNames.has('scaffold'));
    assert.ok(toolNames.has('i18n'));
    assert.ok(toolNames.has('test_accessibility'));
    assert.ok(toolNames.has('list_stories'));

    assert.equal(toolNames.has('security_audit_supply_chain'), false);
    assert.equal(toolNames.has('git_commit_apply'), false);
  });

  it('supports union of multiple profiles (frontend + security)', async () => {
    const client = await createConnectedClient({ profile: 'frontend,security' });
    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((t) => t.name));

    assert.ok(toolNames.has('list_components'));
    assert.ok(toolNames.has('security_scan_secrets'));
    assert.ok(toolNames.has('security_audit_compliance'));
    assert.ok(toolNames.has('scaffold'));

    assert.equal(toolNames.has('flint_run_trace'), false);
    assert.equal(toolNames.has('git_commit_apply'), false);
  });

  it('supports explicit tools allowlist', async () => {
    const client = await createConnectedClient({ tools: ['git_status', 'git_diff'] });
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    assert.deepEqual(toolNames.sort(), ['git_diff', 'git_status']);
  });

  it('defaults to full catalog when no profile options are given', async () => {
    const client = await createConnectedClient();
    const { tools } = await client.listTools();
    assert.ok(tools.length > 90, `Expected > 90 tools, got ${tools.length}`);
  });
});

describe('Polymorphic Dispatchers', () => {
  let client: Client;

  it('initializes client for polymorphic tool testing', async () => {
    client = await createConnectedClient();
    assert.ok(client);
  });

  it('dispatches scaffold for component (dry run)', async () => {
    const resultJson = await callTool(client, 'scaffold', {
      type: 'component',
      name: 'test-badge',
      level: 'atom',
      area: 'Feedback',
      apply: false,
    });
    const parsed = JSON.parse(resultJson) as {
      applied: boolean;
      componentName: string;
      storyTitle: string;
      levelFolder: string;
      files: string[];
    };

    assert.equal(parsed.applied, false);
    assert.equal(parsed.componentName, 'TestBadge');
    assert.equal(parsed.storyTitle, 'Atoms/Feedback/TestBadge');
    assert.equal(parsed.levelFolder, 'atoms');
    assert.ok(parsed.files.length > 0);
  });

  it('dispatches scaffold for package (dry run)', async () => {
    const resultJson = await callTool(client, 'scaffold', {
      type: 'package',
      name: 'math-helpers',
      description: 'Math utilities',
      apply: false,
    });
    const parsed = JSON.parse(resultJson) as {
      applied: boolean;
      relativeDir: string;
      files: string[];
    };

    assert.equal(parsed.applied, false);
    assert.equal(parsed.relativeDir, 'packages/math-helpers');
    assert.ok(parsed.files.includes('package.json'));
    assert.ok(parsed.files.includes('tsconfig.json'));
  });

  it('dispatches scaffold for composable (dry run)', async () => {
    const resultJson = await callTool(client, 'scaffold', {
      type: 'composable',
      name: 'use-window-size',
      apply: false,
    });
    const parsed = JSON.parse(resultJson) as {
      applied: boolean;
      name: string;
      camel: string;
      files: string[];
    };

    assert.equal(parsed.applied, false);
    assert.equal(parsed.name, 'use-window-size');
    assert.equal(parsed.camel, 'useWindowSize');
  });

  it('dispatches i18n survey and coverage', async () => {
    const surveyJson = await callTool(client, 'i18n', {
      action: 'list',
      group: 'apps',
    });
    assert.ok(surveyJson.length > 0);

    const coverageJson = await callTool(client, 'i18n', {
      action: 'coverage',
      group: 'apps',
      name: 'website',
    });
    const coverage = JSON.parse(coverageJson) as {
      member: string;
      localesDir: string;
      coverage: unknown;
    };
    assert.equal(coverage.member, 'website');
    assert.ok(coverage.localesDir.includes('locales'));
  });

  it('dispatches git_metadata for branches, tags, and files', async () => {
    const branchesJson = await callTool(client, 'git_metadata', { kind: 'branches' });
    const branches = JSON.parse(branchesJson) as { operation: string; currentBranch?: string };
    assert.equal(branches.operation, 'branches');

    const filesJson = await callTool(client, 'git_metadata', { kind: 'files', path: 'package.json' });
    const files = JSON.parse(filesJson) as { operation: string; stdout: string };
    assert.equal(files.operation, 'ls-files');
    assert.ok(files.stdout.includes('package.json'));
  });
});

describe('Workspace Task Intelligence Features', () => {
  let client: Client;

  it('initializes client for workspace tasks', async () => {
    client = await createConnectedClient();
    assert.ok(client);
  });

  it('runs repo_affected_packages', async () => {
    const resultJson = await callTool(client, 'repo_affected_packages');
    const result = JSON.parse(resultJson) as {
      rootConfigChanged: boolean;
      totalChangedFiles: number;
      affectedPackages: { name: string; relativeDir: string; changedFileCount: number }[];
      summary: string;
    };

    assert.ok(typeof result.rootConfigChanged === 'boolean');
    assert.ok(typeof result.totalChangedFiles === 'number');
    assert.ok(Array.isArray(result.affectedPackages));
    assert.ok(typeof result.summary === 'string');
  });

  it('discovers Storybook stories with list_stories', async () => {
    const resultJson = await callTool(client, 'list_stories', { limit: 10 });
    const result = JSON.parse(resultJson) as {
      totalStories: number;
      stories: { filePath: string; componentName: string; level?: string }[];
      message: string;
    };

    assert.ok(result.totalStories > 0);
    assert.ok(result.stories.length <= 10);
    assert.ok(result.stories.every((s) => s.filePath.includes('.stories.')));
  });

  it('executes a targeted test file with run_test_file', async () => {
    const resultJson = await callTool(client, 'run_test_file', {
      filePath: 'mcp/developer/test/commit.test.ts',
      timeoutMs: 30_000,
    });
    const result = JSON.parse(resultJson) as {
      filePath: string;
      runner: string;
      success: boolean;
      exitCode: number;
      durationMs: number;
    };

    assert.equal(result.runner, 'node:test');
    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.ok(result.durationMs > 0);
  });

  it('runs turbo_run in dry-run mode', async () => {
    const resultJson = await callTool(client, 'turbo_run', {
      task: 'build',
      dry: true,
      filter: '@mission-platform/mcp-developer',
    });
    const result = JSON.parse(resultJson) as {
      task: string;
      filter?: string;
      dry: boolean;
      success: boolean;
      exitCode: number;
    };

    assert.equal(result.task, 'build');
    assert.equal(result.dry, true);
    assert.equal(result.filter, '@mission-platform/mcp-developer');
    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
  });

  it('runs repo_prime_dependencies', async () => {
    // Upstream build for mcp-shared has no upstream internal workspace deps to compile
    const resultJson = await callTool(client, 'repo_prime_dependencies', {
      packageName: '@mission-platform/mcp-shared',
      timeoutMs: 30_000,
    });
    const result = JSON.parse(resultJson) as {
      packageName: string;
      filter: string;
      success: boolean;
    };

    assert.equal(result.packageName, '@mission-platform/mcp-shared');
    assert.equal(result.filter, '@mission-platform/mcp-shared^...');
    assert.equal(result.success, true);
  });
});
