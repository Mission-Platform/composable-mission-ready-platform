import { describe, expect, it, vi } from 'vitest';

const verification = vi.hoisted(() => ({
  verify: vi.fn(),
}));

vi.mock('@mission-platform/forge-web-script-wasm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mission-platform/forge-web-script-wasm')>();
  return {
    ...actual,
    verifyForgeWebScriptWasmArtifact: verification.verify,
  };
});

import { compileForgeWebScript } from './compiler.ts';

const span = { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 } as const;

describe('Forge Web Script compiler artifact release gate', () => {
  it('clears release outputs while preserving blocking verification evidence', () => {
    verification.verify.mockReturnValue({
      verified: false,
      diagnostics: [
        {
          code: 'FWS-ARTIFACT-024',
          severity: 'error',
          phase: 'artifact',
          message: 'Artifact content hash does not match the backend result.',
          fileName: 'release.fws',
          span,
        },
      ],
      contentHash: 'forged',
      checkedVariants: ['optimized', 'unoptimized'],
    });

    const artifact = compileForgeWebScript({
      source: 'export fn answer() -> i32 { return 42; }',
      fileName: 'release.fws',
      compilerVersion: '0.1.0',
      optimization: 'debug',
    });

    expect(verification.verify).toHaveBeenCalledOnce();
    expect(artifact.wasm).toBeUndefined();
    expect(artifact.esmSource).toBe('');
    expect(artifact.declarations).toBe('');
    expect(artifact.debugArtifacts).toBeUndefined();
    expect(artifact.wat).toBeUndefined();
    expect(artifact.optimizedWasmPath).toBeUndefined();
    expect(artifact.unoptimizedWasmPath).toBeUndefined();
    expect(artifact.manifest).toBeDefined();
    expect(artifact.analysis).toBeDefined();
    expect(artifact.artifactVerification).toMatchObject({
      verified: false,
      contentHash: 'forged',
      checkedVariants: ['optimized', 'unoptimized'],
    });
    expect(artifact.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FWS-ARTIFACT-024',
          phase: 'artifact',
          blocking: true,
        }),
      ]),
    );
  });
});
