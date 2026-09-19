/**
 * Normalizes a file identifier for Flint compilation.
 * Strips query parameters, converts Windows path separators to POSIX slashes,
 * and collapses duplicate forward slashes.
 *
 * @param fileName - Raw file name or path string.
 * @returns Normalized POSIX-style file path identifier.
 */
export function normalizeFlintFileId(fileName: string): string {
  const withoutQuery = fileName.split('?', 1)[0] ?? fileName;
  return withoutQuery.replaceAll('\\', '/').replaceAll(/\/+/gu, '/');
}

/**
 * Derives a canonical module identifier for a Flint source file.
 * Trims root path prefixes, leading relative path markers, and the `.flint` file extension.
 *
 * @param fileName - File name or path of the Flint source file.
 * @param root - Optional root directory path to strip from the module identifier.
 * @returns Canonical module identifier, or `'<input>'` if the resulting identifier is empty.
 */
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
    .replace(/\.flint$/u, '');
  return moduleId || '<input>';
}
