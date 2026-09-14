import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findRepoRoot, resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

const CONFIG_FILE = 'agent-lsp.json';
const MAX_CONFIG_BYTES = 64 * 1024;

interface RawLspServerDefinition {
  language_id?: unknown;
  extensions?: unknown;
  command?: unknown;
}

interface RawLspConfiguration {
  servers?: unknown;
}

export interface LspServerDefinition {
  readonly languageId: string;
  readonly extensions: readonly string[];
  readonly command: readonly string[];
}

export interface LspConfigurationSnapshot {
  readonly configPath: string;
  readonly configPresent: boolean;
  readonly servers: readonly LspServerDefinition[];
}

export interface LspConfigurationChange {
  readonly applied: boolean;
  readonly configPath: string;
  readonly servers: readonly LspServerDefinition[];
  readonly message: string;
}

function configPath(): string {
  return resolveRepoPath(CONFIG_FILE, 'LSP configuration', { allowMissing: true });
}

function normalizeServer(value: unknown, index: number): LspServerDefinition {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`LSP server ${index} must be an object.`);
  }
  const definition = value as RawLspServerDefinition;
  if (typeof definition.language_id !== 'string' || !definition.language_id.trim()) {
    throw new Error(`LSP server ${index} must define a non-empty language_id.`);
  }
  if (
    !Array.isArray(definition.extensions) ||
    definition.extensions.length === 0 ||
    definition.extensions.some((extension) => typeof extension !== 'string' || !extension.trim())
  ) {
    throw new Error(`LSP server ${index} must define non-empty string extensions.`);
  }
  if (
    !Array.isArray(definition.command) ||
    definition.command.length === 0 ||
    definition.command.some((part) => typeof part !== 'string' || !part)
  ) {
    throw new Error(`LSP server ${index} must define a non-empty string command.`);
  }

  return {
    languageId: definition.language_id.trim(),
    extensions: definition.extensions.map((extension) => extension.trim()),
    command: definition.command,
  };
}

function parseConfiguration(contents: string): readonly LspServerDefinition[] {
  if (Buffer.byteLength(contents, 'utf8') > MAX_CONFIG_BYTES) {
    throw new Error(`LSP configuration exceeds the ${MAX_CONFIG_BYTES}-byte limit.`);
  }
  let parsed: RawLspConfiguration;
  try {
    parsed = JSON.parse(contents) as RawLspConfiguration;
  } catch (error) {
    throw new Error(`LSP configuration is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`);
  }
  if (!parsed || !Array.isArray(parsed.servers)) {
    throw new Error('LSP configuration must contain a "servers" array.');
  }
  return parsed.servers.map((server, index) => normalizeServer(server, index));
}

export function readLspConfiguration(): LspConfigurationSnapshot {
  const root = findRepoRoot();
  const path = configPath();
  if (!readFileIfPresent(path)) {
    return { configPath: relative(root, join(root, CONFIG_FILE)), configPresent: false, servers: [] };
  }
  return {
    configPath: relative(root, path),
    configPresent: true,
    servers: parseConfiguration(readFileSync(path, 'utf8')),
  };
}

function readFileIfPresent(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function serializeConfiguration(servers: readonly LspServerDefinition[]): string {
  return `${JSON.stringify(
    {
      servers: servers.map((server) => ({
        language_id: server.languageId,
        extensions: server.extensions,
        command: server.command,
      })),
    },
    null,
    2,
  )}\n`;
}

function validateUniqueLanguageIds(servers: readonly LspServerDefinition[]): void {
  const seen = new Set<string>();
  for (const server of servers) {
    if (seen.has(server.languageId)) {
      throw new Error(`An LSP server for language "${server.languageId}" is already configured.`);
    }
    seen.add(server.languageId);
  }
}

function validateCommandPaths(command: readonly string[]): void {
  for (const part of command) {
    if (part.startsWith('/') || /^[A-Za-z]:[\\/]/.test(part)) {
      resolveRepoPath(part, 'LSP command path');
    }
  }
}

function applyConfiguration(servers: readonly LspServerDefinition[], apply: boolean): LspConfigurationChange {
  validateUniqueLanguageIds(servers);
  for (const server of servers) validateCommandPaths(server.command);
  const path = configPath();
  if (apply) writeFileSync(path, serializeConfiguration(servers), 'utf8');
  return {
    applied: apply,
    configPath: relative(findRepoRoot(), path),
    servers,
    message: apply
      ? 'Updated the LSP configuration.'
      : 'Previewed the LSP configuration update; no files were changed.',
  };
}

export function addLspConfigurationServer(server: LspServerDefinition, apply = false): LspConfigurationChange {
  const current = readLspConfiguration();
  return applyConfiguration([...current.servers, server], apply);
}

export function editLspConfigurationServer(
  languageId: string,
  updates: Partial<Omit<LspServerDefinition, 'languageId'>> & { readonly languageId?: string },
  apply = false,
): LspConfigurationChange {
  const current = readLspConfiguration();
  const index = current.servers.findIndex((server) => server.languageId === languageId);
  if (index === -1) throw new Error(`No LSP server is configured for language "${languageId}".`);
  const existing = current.servers[index]!;
  const replacement: LspServerDefinition = {
    languageId: updates.languageId?.trim() || existing.languageId,
    extensions: updates.extensions ?? existing.extensions,
    command: updates.command ?? existing.command,
  };
  const servers = current.servers.map((server, serverIndex) => (serverIndex === index ? replacement : server));
  return applyConfiguration(servers, apply);
}
