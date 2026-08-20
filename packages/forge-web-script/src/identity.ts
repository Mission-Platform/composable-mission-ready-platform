export function normalizeForgeWebScriptFileId(fileName: string): string {
  const withoutQuery = fileName.split('?', 1)[0] ?? fileName;
  return withoutQuery.replaceAll('\\', '/').replaceAll(/\/+/gu, '/');
}

export function deriveForgeWebScriptModuleId(fileName: string, root?: string): string {
  const normalized = normalizeForgeWebScriptFileId(fileName);
  const normalizedRoot = root === undefined ? undefined : normalizeForgeWebScriptFileId(root).replace(/\/+$/u, '');
  const relative =
    normalizedRoot !== undefined && normalized.startsWith(`${normalizedRoot}/`)
      ? normalized.slice(normalizedRoot.length + 1)
      : normalized;
  const moduleId = relative
    .replace(/^\.?\//u, '')
    .replace(/^\/+/, '')
    .replace(/\.fws$/u, '');
  return moduleId || '<input>';
}
