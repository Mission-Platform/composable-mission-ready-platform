/**
 * Tests for the Mission Platform MCP server core using `@modelcontextprotocol/sdk`,
 * run with Node's built-in test runner (`node --test`).
 */
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { findRepoRoot } from '@mission-platform/mcp-shared/repo/paths';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import packageJson from '../package.json' with { type: 'json' };
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

  it('advertises the developer package version', () => {
    assert.deepEqual(client.getServerVersion(), {
      name: 'mission-platform-mcp',
      version: packageJson.version,
    });
  });
});

describe('tools', () => {
  it('lists the expected tools', async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((tool) => tool.name));
    for (const expected of [
      'lsp_capabilities',
      'lsp_config_view',
      'lsp_config_add',
      'lsp_config_edit',
      'lsp_detect_servers',
      'lsp_status',
      'lsp_start',
      'lsp_restart',
      'lsp_shutdown',
      'lsp_list_workspace_folders',
      'lsp_add_workspace_folder',
      'lsp_get_server_capabilities',
      'lsp_get_editing_context',
      'lsp_list_symbols',
      'lsp_find_symbol',
      'lsp_inspect_symbol',
      'lsp_go_to_definition',
      'lsp_get_symbol_documentation',
      'lsp_get_symbol_source',
      'lsp_get_document_highlights',
      'lsp_find_references',
      'lsp_find_callers',
      'lsp_find_implementations',
      'lsp_type_hierarchy',
      'lsp_get_cross_repo_references',
      'lsp_preview_edit',
      'lsp_simulate_chain',
      'lsp_apply_edit',
      'lsp_replace_symbol_body',
      'lsp_safe_delete_symbol',
      'lsp_rename',
      'lsp_suggest_fixes',
      'lsp_format_document',
      'lsp_format_range',
      'lsp_execute_command',
      'lsp_get_tests_for_file',
      'lsp_run_build',
      'lsp_run_tests',
      'lsp_debug_context',
      'lsp_review_structure',
      'review_changes',
      'git_status',
      'git_changed_files',
      'git_diff',
      'git_log',
      'git_show',
      'git_branches',
      'git_grep',
      'git_blame',
      'git_ls_files',
      'git_tags',
      'git_remotes',
      'lsp_open_document',
      'lsp_get_diagnostics',
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
      'test_accessibility',
      'list_locales',
      'locale_coverage',
      'add_locale',
      'remove_locale',
      'update_translation',
      'fws_analyze_source',
      'fws_analyze_workspace',
      'fws_inspect_manifest',
      'fws_inspect_sonir',
      'fws_verify_artifact',
      'fws_run_trace',
      'security_scan_secrets',
      'security_analyze_code',
      'security_audit_dependencies',
      'scaffold',
      'i18n',
      'git_metadata',
      'repo_affected_packages',
      'repo_prime_dependencies',
      'turbo_run',
      'run_test_file',
      'list_stories',
    ]) {
      assert.ok(names.has(expected), `missing tool ${expected}`);
    }
  });

  it('exposes the provider-neutral LSP contract', async () => {
    const body = await callTool('lsp_capabilities');
    const report = JSON.parse(body) as {
      contractVersion: number;
      provider: string;
      status: string;
      capabilities: { name: string; status: string; mutatesWorkspace: boolean }[];
    };

    assert.equal(report.contractVersion, 1);
    assert.equal(report.provider, 'mission-platform-developer');
    assert.equal(report.status, 'available');
    assert.equal(report.capabilities.find((capability) => capability.name === 'lsp_start')?.status, 'available');
    assert.equal(
      report.capabilities.find((capability) => capability.name === 'lsp_detect_servers')?.status,
      'available',
    );
    for (const name of [
      'lsp_list_workspace_folders',
      'lsp_add_workspace_folder',
      'lsp_get_server_capabilities',
      'lsp_get_editing_context',
      'lsp_list_symbols',
      'lsp_find_symbol',
      'lsp_inspect_symbol',
      'lsp_go_to_definition',
      'lsp_get_symbol_documentation',
      'lsp_get_symbol_source',
      'lsp_get_document_highlights',
      'lsp_find_references',
      'lsp_find_callers',
      'lsp_find_implementations',
      'lsp_type_hierarchy',
      'lsp_get_cross_repo_references',
      'lsp_preview_edit',
      'lsp_simulate_chain',
      'lsp_apply_edit',
      'lsp_replace_symbol_body',
      'lsp_safe_delete_symbol',
      'lsp_rename',
      'lsp_suggest_fixes',
      'lsp_format_document',
      'lsp_format_range',
      'lsp_execute_command',
      'lsp_get_tests_for_file',
      'lsp_run_build',
      'lsp_run_tests',
    ]) {
      assert.equal(report.capabilities.find((capability) => capability.name === name)?.status, 'available');
    }
    assert.ok(report.capabilities.some((capability) => capability.name === 'lsp_get_diagnostics'));
    assert.ok(
      report.capabilities.some((capability) => capability.name === 'lsp_apply_edit' && capability.mutatesWorkspace),
    );
    assert.deepEqual(
      report.capabilities.find((capability) => capability.name === 'lsp_start'),
      {
        name: 'lsp_start',
        status: 'available',
        mutatesWorkspace: false,
      },
    );
  });

  it('discovers configured language servers without starting them', async () => {
    const report = JSON.parse(await callTool('lsp_detect_servers')) as {
      configPresent: boolean;
      configPath: string;
      servers: { languageId: string; command: string[]; executableAvailable: boolean }[];
    };

    assert.equal(report.configPresent, true);
    assert.equal(report.configPath, 'agent-lsp.json');
    assert.ok(report.servers.some((server) => server.languageId === 'typescript'));
    assert.ok(report.servers.every((server) => server.command.every((part) => !part.startsWith('/'))));
  });

  it('reports that no LSP process is running in the discovery-only stage', async () => {
    const report = JSON.parse(await callTool('lsp_status')) as {
      lifecycle: string;
      sessionCount: number;
      activeSessions: unknown[];
    };

    assert.equal(report.lifecycle, 'discovery-only');
    assert.equal(report.sessionCount, 0);
    assert.deepEqual(report.activeSessions, []);
  });

  it('starts and shuts down a configured language server explicitly', async () => {
    const started = JSON.parse(await callTool('lsp_start', { languageId: 'yaml' })) as {
      session: { sessionId: string; languageId: string; state: string; command: string[] };
    };

    assert.equal(started.session.languageId, 'yaml');
    assert.match(started.session.sessionId, /^lsp-\d+$/);
    assert.ok(['starting', 'running', 'failed'].includes(started.session.state));
    assert.ok(started.session.command.every((part) => !part.startsWith('/')));

    const folders = JSON.parse(
      await callTool('lsp_list_workspace_folders', { sessionId: started.session.sessionId }),
    ) as { sessionId: string; workspaceFolders: { path: string; uri: string; name: string }[] };
    assert.equal(folders.sessionId, started.session.sessionId);
    assert.equal(folders.workspaceFolders.length, 1);
    assert.match(folders.workspaceFolders[0]?.uri ?? '', /^file:\/\//);

    const capabilities = JSON.parse(
      await callTool('lsp_get_server_capabilities', { sessionId: started.session.sessionId }),
    ) as { sessionId: string; initialized: boolean; capabilities: Record<string, unknown> };
    assert.equal(capabilities.sessionId, started.session.sessionId);
    assert.equal(capabilities.initialized, true);
    assert.equal(typeof capabilities.capabilities, 'object');

    const context = JSON.parse(await callTool('lsp_get_editing_context', { sessionId: started.session.sessionId })) as {
      sessionId: string;
      workspaceFolders: unknown[];
      openDocuments: unknown[];
    };
    assert.equal(context.sessionId, started.session.sessionId);
    assert.equal(context.workspaceFolders.length, 1);
    assert.deepEqual(context.openDocuments, []);

    const traversal = await callTool('lsp_add_workspace_folder', {
      sessionId: started.session.sessionId,
      folderPath: '../outside-repository',
    });
    assert.match(traversal, /must remain within the repository root/);

    const stopped = JSON.parse(await callTool('lsp_shutdown', { sessionId: started.session.sessionId })) as {
      stopped: number;
      sessionIds: string[];
    };
    assert.equal(stopped.stopped, 1);
    assert.deepEqual(stopped.sessionIds, [started.session.sessionId]);

    const status = JSON.parse(await callTool('lsp_status')) as { sessionCount: number; activeSessions: unknown[] };
    assert.equal(status.sessionCount, 0);
    assert.deepEqual(status.activeSessions, []);
  });

  it('does not start an unconfigured language server', async () => {
    const result = await callTool('lsp_start', { languageId: 'not-configured' });
    assert.match(result, /No LSP server is configured/);
    const status = JSON.parse(await callTool('lsp_status')) as { sessionCount: number };
    assert.equal(status.sessionCount, 0);
  });

  it('opens a bounded document and returns published diagnostics', async () => {
    const started = JSON.parse(await callTool('lsp_start', { languageId: 'yaml' })) as {
      session: { sessionId: string };
    };

    const opened = JSON.parse(
      await callTool('lsp_open_document', {
        sessionId: started.session.sessionId,
        filePath: 'package.json',
        documentLanguageId: 'json',
      }),
    ) as { sessionId: string; filePath: string; uri: string; languageId: string; version: number };
    assert.equal(opened.sessionId, started.session.sessionId);
    assert.equal(opened.filePath.endsWith('/package.json'), true);
    assert.match(opened.uri, /^file:\/\//);
    assert.equal(opened.languageId, 'json');
    assert.equal(opened.version, 1);

    const diagnostics = JSON.parse(
      await callTool('lsp_get_diagnostics', { sessionId: started.session.sessionId, filePath: 'package.json' }),
    ) as { sessionId: string; diagnostics: unknown[] };
    assert.equal(diagnostics.sessionId, started.session.sessionId);
    assert.ok(Array.isArray(diagnostics.diagnostics));

    await callTool('lsp_shutdown', { sessionId: started.session.sessionId });
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

  it('returns authoritative FWS guidance with the terminology correction', async () => {
    const body = await callTool('get_guide', { area: 'fws-authoring' });
    assert.match(body, /Forge Web Script \(FWS\)/);
    assert.match(body, /borrowed/);
    assert.match(body, /FMS.*FWS/);
    const security = await callTool('get_guide', { area: 'fws-security' });
    assert.match(security, /deny-by-default/);
    assert.match(security, /OWASP/);
    const artifact = await callTool('get_guide', { area: 'fws-artifact-verification' });
    assert.match(artifact, /WebAssembly\.validate/);
    const forensics = await callTool('get_guide', { area: 'fws-forensics' });
    assert.match(forensics, /capability-denied/);
  });

  it('analyzes bounded source through the canonical FWS report', async () => {
    const body = await callTool('fws_analyze_source', {
      source: 'export fn answer() -> i32 { return 42; }',
      policy: { profile: 'strict', allowedCapabilities: [] },
    });
    const result = JSON.parse(body) as { analysis: { findings: unknown[]; policy: { profile: string } } };
    assert.equal(result.analysis.findings.length, 0);
    assert.equal(result.analysis.policy.profile, 'strict');
  });

  it('preserves FWS analysis defaults while accepting partial policy limits and target features', async () => {
    const omitted = JSON.parse(
      await callTool('fws_analyze_source', { source: 'export fn answer() -> i32 { return 42; }' }),
    ) as {
      analysis: {
        policy: {
          profile: string;
          allowedCapabilities: string[];
          limits: Record<string, number>;
          blockingSeverities: string[];
        };
      };
    };
    assert.deepEqual(omitted.analysis.policy, {
      profile: 'strict',
      allowedCapabilities: [],
      limits: {
        maxFindings: 1000,
        maxCallDepth: 256,
        maxLoopIterations: 1_000_000,
        maxAllocationBytes: 64 * 1024 * 1024,
        maxAsyncTasks: 1024,
        maxRegexInputLength: 1_000_000,
      },
      boundsChecks: 'runtime',
      blockingSeverities: ['error'],
    });

    const populated = JSON.parse(
      await callTool('fws_analyze_source', {
        source: 'export fn answer() -> i32 { return 42; }',
        policy: {
          profile: 'development',
          allowedCapabilities: ['scheduler.microtask'],
          boundsChecks: 'proven-safe',
          limits: { maxCallDepth: 17, maxAsyncTasks: 8 },
        },
        targetFeatures: { simd: true, memory64: false },
      }),
    ) as {
      analysis: {
        findings: unknown[];
        policy: {
          profile: string;
          allowedCapabilities: string[];
          limits: Record<string, number>;
          blockingSeverities: string[];
        };
      };
    };
    assert.equal(populated.analysis.findings.length, 0);
    assert.deepEqual(populated.analysis.policy, {
      profile: 'development',
      allowedCapabilities: ['scheduler.microtask'],
      limits: {
        maxFindings: 1000,
        maxCallDepth: 17,
        maxLoopIterations: 1_000_000,
        maxAllocationBytes: 64 * 1024 * 1024,
        maxAsyncTasks: 8,
        maxRegexInputLength: 1_000_000,
      },
      boundsChecks: 'proven-safe',
      blockingSeverities: ['error'],
    });
  });

  it('rejects traversal, oversized limits, malformed inputs, and arbitrary trace requests', async () => {
    const traversal = await client.callTool({
      name: 'fws_analyze_source',
      arguments: { sourcePath: '../outside.fws' },
    });
    assert.equal(traversal.isError, true);

    const oversized = await client.callTool({
      name: 'fws_analyze_source',
      arguments: { source: 'x'.repeat(256 * 1024 + 1) },
    });
    assert.equal(oversized.isError, true);

    const malformed = await client.callTool({
      name: 'fws_inspect_manifest',
      arguments: { manifestPath: 'package.json' },
    });
    assert.equal(malformed.isError, true);

    const arbitrary = await client.callTool({
      name: 'fws_run_trace',
      arguments: { artifactPath: 'package.json', maxSteps: 0 },
    });
    assert.equal(arbitrary.isError, true);

    const multibyteOversized = await client.callTool({
      name: 'fws_run_trace',
      arguments: {
        source: `/** ${'é'.repeat(131_073)} */ export fn answer() -> i32 { return 42; }`,
      },
    });
    assert.equal(multibyteOversized.isError, true);

    const tracePrefix = '/** ';
    const traceSuffix = ' */ export fn answer() -> i32 { return 42; }';
    const traceBudget = 256 * 1024 - new TextEncoder().encode(tracePrefix + traceSuffix).byteLength;
    const atByteLimit = `${tracePrefix}${'é'.repeat(Math.floor(traceBudget / 2))}${traceBudget % 2 ? ' ' : ''}${traceSuffix}`;
    assert.equal(new TextEncoder().encode(atByteLimit).byteLength, 256 * 1024);
    const multibyteAtLimit = await client.callTool({
      name: 'fws_run_trace',
      arguments: { source: atByteLimit },
    });
    assert.notEqual(multibyteAtLimit.isError, true);
  });

  it('captures only a capped, capability-denied FWS trace', async () => {
    const body = await callTool('fws_run_trace', {
      source: 'export fn answer() -> i32 { return 42; }',
      mode: 'interpret',
      maxSteps: 1_000_000,
      maxEvents: 4,
      maxTraceBytes: 4096,
      capture: 'summary',
    });
    const result = JSON.parse(body) as {
      safe: boolean;
      execution: string;
      mode: string;
      steps: number;
    };
    assert.equal(result.safe, true);
    assert.equal(result.execution, 'capability-denied-self-hosted-probe');
    assert.equal(result.mode, 'interpret');
    assert.ok(result.steps <= 1_000_000);
  });

  it('inspects a .sonir.json artifact and returns a valid summary', async () => {
    const body = await callTool('fws_inspect_sonir', {
      sonIrPath: 'packages/compiler/forge/forge-web-script/src/fixtures/test.sonir.json',
      maxNodes: 10,
      maxFunctions: 10,
    });
    const result = JSON.parse(body) as {
      schemaVersion: string;
      compilerVersion: string;
      languageVersion: string;
      abiVersion: string;
      sourceHash: string;
      graphHash: string;
      optimization: string;
      boundsChecks: string;
      memoryModel: string;
      nodeCount: number;
      regionCount: number;
      functionCount: number;
      functions: unknown[];
      optimizerPasses: unknown[];
      nodes: unknown[];
      truncated: boolean;
    };
    assert.equal(result.schemaVersion, '1.0');
    assert.equal(result.memoryModel, 'region-arc-checked-linear');
    assert.ok(['debug', 'release'].includes(result.optimization));
    assert.ok(['runtime', 'proven-safe', 'excluded-by-profile'].includes(result.boundsChecks));
    assert.ok(result.nodeCount >= 0);
    assert.ok(result.functionCount >= 0);
    assert.ok(result.regionCount >= 0);
  });

  it('rejects path traversal and malformed .sonir.json in fws_inspect_sonir', async () => {
    const traversal = await client.callTool({
      name: 'fws_inspect_sonir',
      arguments: { sonIrPath: '../outside.sonir.json' },
    });
    assert.equal(traversal.isError, true);

    const malformed = await client.callTool({
      name: 'fws_inspect_sonir',
      arguments: { sonIrPath: 'package.json' },
    });
    assert.equal(malformed.isError, true);

    const nonexistent = await client.callTool({
      name: 'fws_inspect_sonir',
      arguments: { sonIrPath: 'nonexistent.sonir.json' },
    });
    assert.equal(nonexistent.isError, true);
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

  it('reports partial locale coverage for a member', async () => {
    const coverage = JSON.parse(await callTool('locale_coverage', { name: 'website' })) as {
      code: string;
      keyCount: number;
      missingKeys: string[];
      extraKeys: string[];
    }[];
    const spanish = coverage.find((entry) => entry.code === 'es');
    assert.ok(spanish, 'website should have Spanish coverage');
    assert.ok((spanish?.keyCount ?? 0) > 0);
    assert.deepEqual(spanish?.missingKeys, []);
    assert.deepEqual(spanish?.extraKeys, []);
  });

  it('reports members without YAML locale files descriptively', async () => {
    const result = await client.callTool({ name: 'locale_coverage', arguments: { name: 'docs' } });
    assert.equal(result.isError, undefined);
    const content = result.content as { text: string }[];
    assert.match(content[0]?.text ?? '', /has no YAML locale files/);
  });

  it('supports flat locale layouts and coverage through the server', async () => {
    const fixtureName = `.mcp-flat-locale-${Date.now()}`;
    const fixture = join(findRepoRoot(), 'apps', fixtureName);
    const locales = join(fixture, 'locales');
    mkdirSync(locales, { recursive: true });
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ name: 'mcp-flat-locale-fixture', version: '0.0.0' }));
    writeFileSync(join(locales, 'en.yaml'), 'home:\n  title: Hello\n  subtitle: Welcome\n');
    writeFileSync(join(locales, 'es.yaml'), 'home:\n  title: Hola\nextra:\n  value: Extra\n');

    try {
      const coverage = JSON.parse(await callTool('locale_coverage', { name: fixtureName })) as {
        code: string;
        keyCount: number;
        missingKeys: string[];
        extraKeys: string[];
      }[];
      assert.deepEqual(coverage, [
        {
          code: 'es',
          keyCount: 2,
          missingKeys: ['home.subtitle'],
          extraKeys: ['extra.value'],
        },
      ]);

      const added = JSON.parse(
        await callTool('add_locale', {
          name: fixtureName,
          locale: 'fr',
        }),
      ) as { applied: boolean; files: string[] };
      assert.equal(added.applied, false);
      assert.ok(added.files.some((file) => file.endsWith('/fr.yaml')));
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
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

  it('applies and then removes a locale while keeping writes explicit', async () => {
    const locale = `zz-mcp-${Date.now()}`;
    let added = false;
    try {
      const created = JSON.parse(await callTool('add_locale', { name: 'website', locale, apply: true })) as {
        applied: boolean;
        files: string[];
      };
      added = created.applied;
      assert.equal(created.applied, true);
      assert.ok(created.files.length > 0);

      const updated = JSON.parse(
        await callTool('update_translation', {
          name: 'website',
          locale,
          namespace: 'mp.website',
          entries: { 'seo.title': 'MCP probe' },
          apply: true,
        }),
      ) as { applied: boolean; updatedKeys: string[] };
      assert.equal(updated.applied, true);
      assert.deepEqual(updated.updatedKeys, ['seo.title']);
    } finally {
      if (added) {
        const removed = JSON.parse(await callTool('remove_locale', { name: 'website', locale, apply: true })) as {
          applied: boolean;
        };
        assert.equal(removed.applied, true);
      }
    }
  });

  it('rejects invalid locale codes and protects the default locale', async () => {
    const invalid = await client.callTool({
      name: 'add_locale',
      arguments: { name: 'website', locale: 'not a locale' },
    });
    assert.equal(invalid.isError, true);

    const removeDefault = await client.callTool({
      name: 'remove_locale',
      arguments: { name: 'website', locale: 'en' },
    });
    assert.equal(removeDefault.isError, true);
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

  it('returns a bounded read-only change review report', async () => {
    const report = JSON.parse(await callTool('review_changes', { maxFiles: 2 })) as {
      operation: string;
      changed: { operation: string; files: unknown[] };
      diff: { operation: string };
      selectedFiles: string[];
      diagnostics: unknown[];
      tests: unknown[];
      security?: {
        clean: boolean;
        findingsCount: number;
        findings: unknown[];
      };
    };
    assert.equal(report.operation, 'review_changes');
    assert.equal(report.changed.operation, 'changed-files');
    assert.equal(report.diff.operation, 'diff');
    assert.ok(report.changed.files.length >= report.selectedFiles.length);
    assert.deepEqual(report.diagnostics, []);
    assert.deepEqual(report.tests, []);
    assert.ok(report.security);
    assert.equal(typeof report.security.clean, 'boolean');
  });

  it('invokes security analysis tools via MCP tool protocol', async () => {
    const secretsOutput = JSON.parse(await callTool('security_scan_secrets', { path: 'packages/' })) as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof secretsOutput.clean, 'boolean');
    assert.ok(Array.isArray(secretsOutput.findings));

    const codeOutput = JSON.parse(await callTool('security_analyze_code', { path: 'packages/' })) as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof codeOutput.clean, 'boolean');
    assert.ok(Array.isArray(codeOutput.findings));

    const depsOutput = JSON.parse(await callTool('security_audit_dependencies', { runPnpmAudit: false })) as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof depsOutput.clean, 'boolean');
    assert.ok(Array.isArray(depsOutput.findings));
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

  it('publishes FWS guides as shared resources', async () => {
    const { resources } = await client.listResources();
    const uris = new Set(resources.map((resource) => resource.uri));
    for (const id of ['fws-authoring', 'fws-security', 'fws-artifact-verification', 'fws-forensics'])
      assert.ok(uris.has(`mission://guide/${id}`), `missing FWS guide resource ${id}`);
  });
});

describe('prompts', () => {
  it('lists the workflow prompts', async () => {
    const { prompts } = await client.listPrompts();
    const names = new Set(prompts.map((prompt) => prompt.name));
    for (const expected of [
      'fws-authoring',
      'fws-secure-review',
      'fws-compile-verify',
      'fws-forensic-debug',
      'debug-code',
      'review-changes',
      'review-structure',
      'use-component',
      'create-package',
      'develop-package',
      'create-app',
      'create-worker',
      'security-audit',
    ]) {
      assert.ok(names.has(expected), `missing prompt ${expected}`);
    }
  });

  it('builds a secure FWS compile/verify prompt', async () => {
    const result = await client.getPrompt({
      name: 'fws-compile-verify',
      arguments: { sourcePath: 'examples/demo.fws', profile: 'strict' },
    });
    const messages = result.messages as { content: { text: string } }[];
    assert.match(messages[0]?.content.text ?? '', /analysis.*compile/i);
    assert.match(messages[0]?.content.text ?? '', /WebAssembly\.validate|fws_verify_artifact/);
  });

  it('builds a create-package prompt with the name substituted', async () => {
    const result = await client.getPrompt({
      name: 'create-package',
      arguments: { name: 'demo-utils', purpose: 'Demo.' },
    });
    const messages = result.messages as { content: { text: string } }[];
    assert.match(messages[0]?.content.text ?? '', /@mission-platform\/demo-utils/);
  });

  it('builds evidence-first debugging and review prompts', async () => {
    const debug = await client.getPrompt({ name: 'debug-code', arguments: { filePath: 'package.json' } });
    const debugText = (debug.messages as { content: { text: string } }[])[0]?.content.text ?? '';
    assert.match(debugText, /lsp_debug_context/);

    const review = await client.getPrompt({ name: 'review-changes', arguments: { ref: 'HEAD~1' } });
    const reviewText = (review.messages as { content: { text: string } }[])[0]?.content.text ?? '';
    assert.match(reviewText, /review_changes/);
    assert.match(reviewText, /severity/);

    const secAudit = await client.getPrompt({ name: 'security-audit', arguments: { path: 'packages/' } });
    const secText = (secAudit.messages as { content: { text: string } }[])[0]?.content.text ?? '';
    assert.match(secText, /security_scan_secrets/);
    assert.match(secText, /security_analyze_code/);
    assert.match(secText, /packages\//);

    const stagedAudit = await client.getPrompt({ name: 'security-audit', arguments: { staged: 'true' } });
    const stagedText = (stagedAudit.messages as { content: { text: string } }[])[0]?.content.text ?? '';
    assert.match(stagedText, /only security_scan_secrets is limited to staged changes/);
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
