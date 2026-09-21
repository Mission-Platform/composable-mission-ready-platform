import { describe, expect, it } from 'vitest';

import {
  createFlintSelfHostedStageArtifact,
  decodeFlintSelfHostedDiagnostics,
  decodeFlintSelfHostedStageArtifact,
  encodeFlintSelfHostedDiagnostics,
  encodeFlintSelfHostedStageArtifact,
  hashFlintSelfHostedSourceIdentity,
} from './artifact.ts';

const diagnostic = {
  code: 'FLINT-PARSE-001',
  severity: 'error' as const,
  phase: 'parse' as const,
  message: 'expected a declaration',
  fileName: 'main.flint',
  span: { start: 4, end: 5, line: 1, column: 5, endLine: 1, endColumn: 6 },
  hint: 'Add a declaration.',
};

describe('Forge Web Script self-hosted artifact protocol', () => {
  it('round-trips a canonical stage artifact and diagnostics', () => {
    const identity = {
      sourceHash: hashFlintSelfHostedSourceIdentity('export fn main() -> i32 { return 1; }', 'main.flint', 'graph-a'),
      fileName: 'main.flint',
      graphHash: 'graph-a',
    };
    const artifact = createFlintSelfHostedStageArtifact('parse', identity, new Uint8Array([3, 1, 4]), [diagnostic]);
    const encoded = encodeFlintSelfHostedStageArtifact(artifact);
    const decoded = decodeFlintSelfHostedStageArtifact(encoded, {
      expectedStage: 'parse',
      expectedIdentity: identity,
    });

    expect(decoded).toEqual(artifact);
    expect(encodeFlintSelfHostedStageArtifact(decoded)).toEqual(encoded);
    expect(decodeFlintSelfHostedDiagnostics(decoded.diagnosticPayload ?? new Uint8Array())).toEqual([diagnostic]);
  });

  it('canonicalizes diagnostic ordering without mutating the input', () => {
    const diagnostics = [
      diagnostic,
      { ...diagnostic, code: 'FLINT-PARSE-000', span: { ...diagnostic.span, start: 1 } },
    ];
    const encoded = encodeFlintSelfHostedDiagnostics(diagnostics);
    expect(decodeFlintSelfHostedDiagnostics(encoded).map(({ code }) => code)).toEqual([
      'FLINT-PARSE-000',
      'FLINT-PARSE-001',
    ]);
    expect(diagnostics[0]?.code).toBe('FLINT-PARSE-001');
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
    const artifact = createFlintSelfHostedStageArtifact(
      'lex',
      {
        sourceHash: 'source',
        fileName: 'main.flint',
      },
      new Uint8Array([1]),
    );
    expect(() => decodeFlintSelfHostedStageArtifact(mutate(encodeFlintSelfHostedStageArtifact(artifact)))).toThrow(
      'Invalid Flint self-hosted artifact',
    );
  });

  it('rejects stale, wrong-stage, and oversized payloads before decode', () => {
    const encoded = encodeFlintSelfHostedStageArtifact(
      createFlintSelfHostedStageArtifact(
        'lex',
        { sourceHash: 'source', fileName: 'main.flint' },
        new Uint8Array([1, 2]),
      ),
    );
    expect(() => decodeFlintSelfHostedStageArtifact(encoded, { expectedStage: 'parse' })).toThrow(
      "expected stage 'parse'",
    );
    expect(() => decodeFlintSelfHostedStageArtifact(encoded, { expectedIdentity: { sourceHash: 'stale' } })).toThrow(
      'source identity hash does not match',
    );
    expect(() => decodeFlintSelfHostedStageArtifact(encoded, { maxPayloadBytes: 1 })).toThrow(
      'payload exceeds configured limit',
    );
  });
});
