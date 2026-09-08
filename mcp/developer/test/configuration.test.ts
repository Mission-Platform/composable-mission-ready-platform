import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
