import { describe, expect, it } from 'vitest';

import {
  createForgeWebScriptSelfHostedStageArtifact,
  decodeForgeWebScriptSelfHostedDiagnostics,
  decodeForgeWebScriptSelfHostedStageArtifact,
  encodeForgeWebScriptSelfHostedDiagnostics,
  encodeForgeWebScriptSelfHostedStageArtifact,
  hashForgeWebScriptSelfHostedSourceIdentity,
} from './artifact.ts';

const diagnostic = {
  code: 'FWS-PARSE-001',
  severity: 'error' as const,
  phase: 'parse' as const,
  message: 'expected a declaration',
  fileName: 'main.fws',
  span: { start: 4, end: 5, line: 1, column: 5, endLine: 1, endColumn: 6 },
  hint: 'Add a declaration.',
};

describe('Forge Web Script self-hosted artifact protocol', () => {
  it('round-trips a canonical stage artifact and diagnostics', () => {
    const identity = {
      sourceHash: hashForgeWebScriptSelfHostedSourceIdentity(
        'export fn main() -> i32 { return 1; }',
        'main.fws',
        'graph-a',
      ),
      fileName: 'main.fws',
      graphHash: 'graph-a',
    };
    const artifact = createForgeWebScriptSelfHostedStageArtifact('parse', identity, new Uint8Array([3, 1, 4]), [
      diagnostic,
    ]);
    const encoded = encodeForgeWebScriptSelfHostedStageArtifact(artifact);
    const decoded = decodeForgeWebScriptSelfHostedStageArtifact(encoded, {
      expectedStage: 'parse',
      expectedIdentity: identity,
    });

    expect(decoded).toEqual(artifact);
    expect(encodeForgeWebScriptSelfHostedStageArtifact(decoded)).toEqual(encoded);
    expect(decodeForgeWebScriptSelfHostedDiagnostics(decoded.diagnosticPayload!)).toEqual([diagnostic]);
  });

  it('canonicalizes diagnostic ordering without mutating the input', () => {
    const diagnostics = [diagnostic, { ...diagnostic, code: 'FWS-PARSE-000', span: { ...diagnostic.span, start: 1 } }];
    const encoded = encodeForgeWebScriptSelfHostedDiagnostics(diagnostics);
    expect(decodeForgeWebScriptSelfHostedDiagnostics(encoded).map(({ code }) => code)).toEqual([
      'FWS-PARSE-000',
      'FWS-PARSE-001',
    ]);
    expect(diagnostics[0]?.code).toBe('FWS-PARSE-001');
  });

  it.each([
    (bytes: Uint8Array) => bytes.slice(0, -1),
    (bytes: Uint8Array) => new Uint8Array([...bytes, 0]),
    (bytes: Uint8Array) => {
      const copy = new Uint8Array(bytes);
      copy[5] = 0xff;
      return copy;
    },
  ])('rejects malformed framed artifacts', (mutate) => {
    const artifact = createForgeWebScriptSelfHostedStageArtifact(
      'lex',
      {
        sourceHash: 'source',
        fileName: 'main.fws',
      },
      new Uint8Array([1]),
    );
    expect(() =>
      decodeForgeWebScriptSelfHostedStageArtifact(mutate(encodeForgeWebScriptSelfHostedStageArtifact(artifact))),
    ).toThrow('Invalid Forge Web Script self-hosted artifact');
  });

  it('rejects stale, wrong-stage, and oversized payloads before decode', () => {
    const encoded = encodeForgeWebScriptSelfHostedStageArtifact(
      createForgeWebScriptSelfHostedStageArtifact(
        'lex',
        { sourceHash: 'source', fileName: 'main.fws' },
        new Uint8Array([1, 2]),
      ),
    );
    expect(() => decodeForgeWebScriptSelfHostedStageArtifact(encoded, { expectedStage: 'parse' })).toThrow(
      "expected stage 'parse'",
    );
    expect(() =>
      decodeForgeWebScriptSelfHostedStageArtifact(encoded, { expectedIdentity: { sourceHash: 'stale' } }),
    ).toThrow('source identity hash does not match');
    expect(() => decodeForgeWebScriptSelfHostedStageArtifact(encoded, { maxPayloadBytes: 1 })).toThrow(
      'payload exceeds configured limit',
    );
  });
});
