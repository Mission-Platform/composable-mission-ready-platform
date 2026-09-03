export interface ForgePathValidationResult {
  readonly valid: boolean;
  readonly normalizedPath?: string;
  readonly reason?: 'empty' | 'absolute' | 'traversal' | 'invalid-segment' | 'unsupported-extension';
}

const ALLOWED_SEGMENT = /^[\p{L}\p{N}._-]+$/u;

export function validateRepositoryRelativePath(
  value: string,
  allowedExtensions: readonly string[] = ['.tsx', '.scss', '.png', '.jpg', '.jpeg', '.webp', '.svg'],
): ForgePathValidationResult {
  const normalizedPath = value.trim().replaceAll('\\', '/');
  if (!normalizedPath) return { valid: false, reason: 'empty' };
  if (normalizedPath.startsWith('/') || /^[a-zA-Z]:\//.test(normalizedPath))
    return { valid: false, reason: 'absolute' };

  const segments = normalizedPath.split('/');
  if (segments.includes('..')) return { valid: false, reason: 'traversal' };
  if (segments.some((segment) => !segment || !ALLOWED_SEGMENT.test(segment)))
    return { valid: false, reason: 'invalid-segment' };
  if (!allowedExtensions.some((extension) => normalizedPath.endsWith(extension)))
    return { valid: false, reason: 'unsupported-extension' };
  return { valid: true, normalizedPath };
}
