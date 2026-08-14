import path from 'node:path';

export const DEFAULT_ARTIFACT_DIRECTORY = '.artifacts/runtime-validation';

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function relativeRepositoryPath(repositoryRoot: string, filePath: string): string {
  return toPosixPath(path.relative(repositoryRoot, filePath));
}

export function safeArtifactName(value: string): string {
  return (
    value
      .replaceAll(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^\.+/, '_')
      .slice(0, 180) || 'item'
  );
}

export function artifactPath(
  repositoryRoot: string,
  target: RuntimeTargetLike,
  id: string,
  extension: 'json' | 'log' | 'png' = 'log',
): string {
  return path.join(repositoryRoot, DEFAULT_ARTIFACT_DIRECTORY, target, `${safeArtifactName(id)}.${extension}`);
}

type RuntimeTargetLike = 'story' | 'app' | 'manifest';
