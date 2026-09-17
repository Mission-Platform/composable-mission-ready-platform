import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { reviewChanges } from './lsp/reviews.ts';
import { registerPrompts } from './prompts/index.ts';
import { registerTools } from './tools/index.ts';

describe('developer MCP security integration', () => {
  let tempDir: string;
  let server: McpServer;
  let client: Client;

  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'dev-mcp-sec-'));

    server = new McpServer({
      name: 'test-developer-server',
      version: '0.1.0',
    });
    registerTools(server);
    registerPrompts(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '0.1.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  after(async () => {
    await client.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs security_scan_secrets through MCP tool invocation', async () => {
    const result = await client.callTool({
      name: 'security_scan_secrets',
      arguments: {
        path: 'packages/',
        maxFiles: 5,
      },
    });

    assert.equal(result.isError, undefined);
    const content = result.content as { text: string }[];
    const parsed = JSON.parse(content[0]?.text ?? '{}') as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof parsed.clean, 'boolean');
    assert.ok(Array.isArray(parsed.findings));
  });

  it('runs security_analyze_code through MCP tool invocation', async () => {
    const result = await client.callTool({
      name: 'security_analyze_code',
      arguments: {
        path: 'packages/',
        maxFiles: 5,
      },
    });

    assert.equal(result.isError, undefined);
    const content = result.content as { text: string }[];
    const parsed = JSON.parse(content[0]?.text ?? '{}') as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof parsed.clean, 'boolean');
    assert.ok(Array.isArray(parsed.findings));
  });

  it('runs security_audit_dependencies through MCP tool invocation', async () => {
    const result = await client.callTool({
      name: 'security_audit_dependencies',
      arguments: {
        runPnpmAudit: false,
      },
    });

    assert.equal(result.isError, undefined);
    const content = result.content as { text: string }[];
    const parsed = JSON.parse(content[0]?.text ?? '{}') as {
      clean: boolean;
      findings: unknown[];
      scannedFiles: number;
    };
    assert.equal(typeof parsed.clean, 'boolean');
    assert.ok(Array.isArray(parsed.findings));
    assert.ok(parsed.scannedFiles > 0);
  });

  it('integrates security findings in reviewChanges output', async () => {
    const review = await reviewChanges({ maxFiles: 5 });
    assert.equal(review.operation, 'review_changes');
    assert.ok(review.security);
    assert.equal(typeof review.security.clean, 'boolean');
    assert.equal(typeof review.security.findingsCount, 'number');
    assert.ok(Array.isArray(review.security.findings));
  });

  it('provides security-audit prompt with guidance', async () => {
    const prompt = await client.getPrompt({
      name: 'security-audit',
      arguments: { path: 'packages/' },
    });
    const messages = prompt.messages as { content: { text: string } }[];
    assert.ok(messages.length > 0);
    const text = messages[0]?.content.text ?? '';
    assert.match(text, /security_scan_secrets/);
    assert.match(text, /security_analyze_code/);
    assert.match(text, /security_audit_dependencies/);
  });

  it('runs security_audit_supply_chain through MCP tool invocation', async () => {
    const result = await client.callTool({
      name: 'security_audit_supply_chain',
      arguments: {},
    });

    assert.equal(result.isError, undefined);
    const content = result.content as { text: string }[];
    const parsed = JSON.parse(content[0]?.text ?? '{}') as {
      clean: boolean;
      findings: unknown[];
      stats: { totalManifests: number; totalDependencies: number };
    };
    assert.equal(typeof parsed.clean, 'boolean');
    assert.ok(Array.isArray(parsed.findings));
    assert.ok(parsed.stats.totalManifests > 0);
  });

  it('runs security_collect_compliance_evidence in json and markdown modes', async () => {
    const jsonResult = await client.callTool({
      name: 'security_collect_compliance_evidence',
      arguments: {
        runPnpmAudit: false,
        maxFiles: 5,
        format: 'json',
      },
    });

    assert.equal(jsonResult.isError, undefined);
    const jsonContent = jsonResult.content as { text: string }[];
    const parsedReport = JSON.parse(jsonContent[0]?.text ?? '{}') as {
      scorecard: { iso27001ComplianceScore: number };
      isoControls: unknown[];
      owaspScorecard: unknown[];
      cweScorecard: unknown[];
    };
    assert.ok(typeof parsedReport.scorecard.iso27001ComplianceScore === 'number');
    assert.ok(Array.isArray(parsedReport.isoControls));
    assert.equal(parsedReport.owaspScorecard.length, 10);

    const mdResult = await client.callTool({
      name: 'security_collect_compliance_evidence',
      arguments: {
        runPnpmAudit: false,
        maxFiles: 5,
        format: 'markdown',
      },
    });
    assert.equal(mdResult.isError, undefined);
    const mdContent = mdResult.content as { text: string }[];
    assert.ok(mdContent[0]?.text.includes('# Security Compliance & Evidence Report'));
    assert.ok(mdContent[0]?.text.includes('ISO 27001 Compliance'));
  });

  it('runs security_audit_compliance for specific standards', async () => {
    const isoResult = await client.callTool({
      name: 'security_audit_compliance',
      arguments: {
        standard: 'iso-27001',
        runPnpmAudit: false,
        maxFiles: 5,
      },
    });
    assert.equal(isoResult.isError, undefined);
    const isoContent = isoResult.content as { text: string }[];
    const isoParsed = JSON.parse(isoContent[0]?.text ?? '{}') as {
      scorecard: { complianceScore: number };
      controls: unknown[];
    };
    assert.ok(typeof isoParsed.scorecard.complianceScore === 'number');
    assert.ok(Array.isArray(isoParsed.controls));

    const owaspResult = await client.callTool({
      name: 'security_audit_compliance',
      arguments: {
        standard: 'owasp-2025',
        runPnpmAudit: false,
        maxFiles: 5,
      },
    });
    assert.equal(owaspResult.isError, undefined);
    const owaspContent = owaspResult.content as { text: string }[];
    const owaspParsed = JSON.parse(owaspContent[0]?.text ?? '{}') as {
      scorecard: unknown[];
      findings: unknown[];
    };
    assert.equal(owaspParsed.scorecard.length, 10);
    assert.ok(Array.isArray(owaspParsed.findings));
  });
});
