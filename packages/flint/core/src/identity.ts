export const FLINT_EXTENSIONS = ['.flint', '.flt'] as const;
export type FlintExtension = (typeof FLINT_EXTENSIONS)[number];

export function isFlintFile(fileName: string): boolean {
  const normalized = normalizeFlintFileId(fileName);
  return FLINT_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

export function normalizeFlintFileId(fileName: string): string {
  const withoutQuery = fileName.split('?', 1)[0] ?? fileName;
  return withoutQuery.replaceAll('\\', '/').replaceAll(/\/+/gu, '/');
}

export function deriveFlintModuleId(fileName: string, root?: string): string {
  const normalized = normalizeFlintFileId(fileName);
  const normalizedRoot = root === undefined ? undefined : normalizeFlintFileId(root).replace(/\/+$/u, '');
  const relative =
    normalizedRoot !== undefined && normalized.startsWith(`${normalizedRoot}/`)
      ? normalized.slice(normalizedRoot.length + 1)
      : normalized;
  const moduleId = relative
    .replace(/^\.?\//u, '')
    .replace(/^\/+/, '')
    .replace(/\.(flint|flt)$/u, '');
  return moduleId || '<input>';
}
