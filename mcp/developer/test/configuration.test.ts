import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { findRepoRoot } from '@mission-platform/mcp-shared/repo/paths';

import {
  addLspConfigurationServer,
  editLspConfigurationServer,
  readLspConfiguration,
} from '../src/lsp/configuration.ts';

describe('LSP configuration', () => {
  it('views the validated repository configuration', () => {
    const configuration = readLspConfiguration();
    assert.equal(configuration.configPath, 'agent-lsp.json');
    assert.equal(configuration.configPresent, true);
    assert.ok(configuration.servers.some((server) => server.languageId === 'typescript'));
  });

  it('verifies agent-lsp.json and agent-lsp.example.json parity and portability', () => {
    const root = findRepoRoot();
    const config = JSON.parse(readFileSync(join(root, 'agent-lsp.json'), 'utf8'));
    const exampleConfig = JSON.parse(readFileSync(join(root, 'agent-lsp.example.json'), 'utf8'));

    assert.deepEqual(config, exampleConfig);

    for (const server of config.servers) {
      assert.ok(Array.isArray(server.command) && server.command.length > 0);
      for (const arg of server.command) {
        assert.ok(
          !arg.startsWith('/'),
          `LSP command argument "${arg}" in server "${server.language_id}" should not be an absolute path.`,
        );
      }
    }
  });

  it('previews additions and edits without writing by default', () => {
    const before = readLspConfiguration();
    const addition = addLspConfigurationServer(
      { languageId: 'test-language', extensions: ['test'], command: ['node', '--version'] },
      false,
    );
    assert.equal(addition.applied, false);
    assert.ok(addition.servers.some((server) => server.languageId === 'test-language'));

    const edit = editLspConfigurationServer('typescript', { extensions: ['type-test'] }, false);
    assert.equal(edit.applied, false);
    assert.deepEqual(readLspConfiguration(), before);
  });

  it('rejects duplicate language identifiers', () => {
    assert.throws(
      () => addLspConfigurationServer({ languageId: 'typescript', extensions: ['ts'], command: ['node'] }, false),
      /already configured/,
    );
  });
});
