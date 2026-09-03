/** Kinds of files a Forge target may retain in its generated artifact tree. */
export type ForgeArtifactKind = 'entry' | 'module' | 'declaration' | 'map' | 'asset' | 'style';

/** One deterministic output recorded by a target-scoped artifact manifest. */
export interface ForgeArtifactRecord {
  readonly fileName: string;
  readonly kind: ForgeArtifactKind;
  readonly hash: string;
  readonly size?: number;
}

/** Complete output inventory for one explicit target. */
export interface ForgeArtifactManifest {
  readonly version: 1;
  readonly targetId: string;
  readonly complete: boolean;
  readonly entries: readonly string[];
  readonly artifacts: readonly ForgeArtifactRecord[];
}

/** Build a stable manifest without introducing timestamps into generated output. */
export function createForgeArtifactManifest(
  targetId: string,
  artifacts: readonly ForgeArtifactRecord[],
  complete = true,
): ForgeArtifactManifest {
  const sortedArtifacts = [...artifacts].sort((left, right) => left.fileName.localeCompare(right.fileName));
  return {
    version: 1,
    targetId,
    complete,
    entries: sortedArtifacts.filter((artifact) => artifact.kind === 'entry').map((artifact) => artifact.fileName),
    artifacts: sortedArtifacts,
  };
}
