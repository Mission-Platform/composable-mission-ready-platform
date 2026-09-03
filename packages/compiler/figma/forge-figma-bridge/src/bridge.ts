import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { link, lstat, mkdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

import {
  validateRepositoryRelativePath,
  type ForgeExportBundle,
  type ForgeExportFile,
  type ForgeRepositoryExportRequest,
} from '@mission-platform/forge-figma';

import {
  FORGE_BRIDGE_PROTOCOL_VERSION,
  type ForgeBridgeFileResult,
  type ForgeBridgeRequest,
  type ForgeBridgeResponse,
} from './protocol.js';

export const DEFAULT_MAX_REQUEST_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_EXPORT_PATH = '/export';
export const DEFAULT_ALLOWED_ORIGIN = 'https://www.figma.com';
export const FORGE_BRIDGE_AUTH_HEADER = 'authorization';
export const FORGE_BRIDGE_TOKEN_HEADER = 'x-forge-bridge-token';

export interface ForgeBridgeOptions {
  readonly repositoryRoots: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  readonly maxRequestBytes?: number;
  readonly maxFileBytes?: number;
  readonly allowedExtensions?: readonly string[];
}

export interface ForgeBridgeServerOptions extends ForgeBridgeOptions {
  readonly exportPath?: string;
  readonly authToken?: string;
  readonly allowedOrigin?: string;
}

export interface ForgeBridgeServer extends Server {
  readonly authToken: string;
  readonly allowedOrigin: string;
}

interface DecodedFile {
  readonly bytes: Uint8Array;
  readonly size: number;
}

interface HttpError {
  readonly statusCode: number;
  readonly message: string;
}

function response(ok: boolean, results: readonly ForgeBridgeFileResult[] = [], error?: string): ForgeBridgeResponse {
  return {
    protocolVersion: FORGE_BRIDGE_PROTOCOL_VERSION,
    ok,
    results,
    ...(error === undefined ? {} : { error }),
  };
}

function configuredRoot(options: ForgeBridgeOptions, rootId: string): string | undefined {
  if (options.repositoryRoots instanceof Map) return options.repositoryRoots.get(rootId);
  return (options.repositoryRoots as Readonly<Record<string, string>>)[rootId];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validRelativeDirectory(value: string): string | undefined {
  const normalized = value.trim().replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) return undefined;
  const segments = normalized.split('/');
  if (segments.includes('..') || segments.some((segment) => !segment || !/^[\p{L}\p{N}._-]+$/u.test(segment)))
    return undefined;
  return normalized;
}

function validRequest(value: unknown): value is ForgeBridgeRequest {
  if (!isRecord(value)) return false;
  if (value.protocolVersion !== FORGE_BRIDGE_PROTOCOL_VERSION) return false;
  if (typeof value.repositoryRootId !== 'string' || !value.repositoryRootId.trim()) return false;
  if (typeof value.targetDirectory !== 'string' || !value.targetDirectory.trim()) return false;
  if (typeof value.overwrite !== 'boolean' || !isRecord(value.bundle)) return false;
  const bundle = value.bundle as Partial<ForgeExportBundle>;
  if (typeof bundle.componentName !== 'string' || !Array.isArray(bundle.files)) return false;
  return bundle.files.length > 0 && bundle.files.every(isExportFile);
}

function isExportFile(value: unknown): value is ForgeExportFile {
  if (!isRecord(value) || typeof value.path !== 'string') return false;
  if (value.kind !== 'tsx' && value.kind !== 'scss' && value.kind !== 'asset') return false;
  return typeof value.content === 'string' || value.content instanceof Uint8Array || isByteArray(value.content);
}

function isByteArray(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.every((byte) => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255)
  );
}

function decodeFile(file: ForgeExportFile): DecodedFile {
  const bytes =
    typeof file.content === 'string'
      ? new TextEncoder().encode(file.content)
      : file.content instanceof Uint8Array
        ? file.content
        : Uint8Array.from(file.content);
  return { bytes, size: bytes.byteLength };
}

function ensureWithinRoot(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('The export path must remain inside the configured repository root.');
  }
}

async function existingAncestor(candidate: string): Promise<string> {
  let current = candidate;
  while (true) {
    try {
      return await realpath(current);
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function ensureSafeDirectory(root: string, directory: string): Promise<void> {
  ensureWithinRoot(root, directory);
  const ancestor = await existingAncestor(directory);
  ensureWithinRoot(root, ancestor);
  await mkdir(directory, { recursive: true });
  const resolved = await realpath(directory);
  ensureWithinRoot(root, resolved);
}

function kindMatchesPath(file: ForgeExportFile): boolean {
  if (file.kind === 'tsx') return file.path.toLowerCase().endsWith('.tsx');
  if (file.kind === 'scss') return file.path.toLowerCase().endsWith('.scss');
  return true;
}

async function writeFileAtomically(
  root: string,
  destination: string,
  bytes: Uint8Array,
  overwrite: boolean,
): Promise<void> {
  const parent = path.dirname(destination);
  await ensureSafeDirectory(root, parent);
  try {
    const existing = await lstat(destination);
    if (existing.isSymbolicLink()) throw new Error('Symbolic-link destinations are not allowed.');
    if (!overwrite) throw new Error('The destination file already exists and overwrite is disabled.');
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }

  const temporary = path.join(parent, `.${path.basename(destination)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
    if (overwrite) await rename(temporary, destination);
    else {
      await link(temporary, destination);
      await rm(temporary, { force: true });
    }
  } finally {
    await rm(temporary, { force: true });
  }
}

async function repositoryRoot(options: ForgeBridgeOptions, rootId: string): Promise<string> {
  const configured = configuredRoot(options, rootId);
  if (!configured) throw new Error('The requested repository root is not configured.');
  const root = await realpath(configured);
  const stats = await lstat(root);
  if (!stats.isDirectory()) throw new Error('The configured repository root is not a directory.');
  return root;
}

export async function exportForgeRepositoryBundle(
  value: unknown,
  options: ForgeBridgeOptions,
): Promise<ForgeBridgeResponse> {
  if (!validRequest(value))
    return response(false, [], 'The bridge request is malformed or uses an unsupported protocol.');
  const request = value as ForgeRepositoryExportRequest;
  const targetDirectory = validRelativeDirectory(request.targetDirectory);
  if (targetDirectory === undefined) return response(false, [], 'The target directory must be a safe relative path.');

  let root: string;
  try {
    root = await repositoryRoot(options, request.repositoryRootId);
    ensureWithinRoot(root, path.resolve(root, targetDirectory));
  } catch (error) {
    return response(false, [], errorMessage(error));
  }

  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const allowedExtensions = options.allowedExtensions;
  const seen = new Set<string>();
  const results: ForgeBridgeFileResult[] = [];
  for (const file of request.bundle.files) {
    const pathValidation = validateRepositoryRelativePath(file.path, allowedExtensions);
    if (!pathValidation.valid || pathValidation.normalizedPath === undefined) {
      results.push({
        path: file.path,
        status: 'rejected',
        error: 'The artifact path is not a safe supported relative path.',
      });
      continue;
    }
    if (!kindMatchesPath(file)) {
      results.push({
        path: file.path,
        status: 'rejected',
        error: `The ${file.kind} artifact has an incompatible file extension.`,
      });
      continue;
    }
    if (seen.has(pathValidation.normalizedPath)) {
      results.push({ path: file.path, status: 'rejected', error: 'Duplicate artifact paths are not allowed.' });
      continue;
    }
    seen.add(pathValidation.normalizedPath);

    const decoded = decodeFile(file);
    if (decoded.size > maxFileBytes) {
      results.push({
        path: file.path,
        status: 'rejected',
        error: `The artifact exceeds the ${maxFileBytes}-byte size limit.`,
      });
      continue;
    }
    const destination = path.resolve(root, targetDirectory, pathValidation.normalizedPath);
    try {
      ensureWithinRoot(root, destination);
      await writeFileAtomically(root, destination, decoded.bytes, request.overwrite);
      results.push({ path: file.path, status: 'written', bytesWritten: decoded.size });
    } catch (error) {
      results.push({ path: file.path, status: 'rejected', error: errorMessage(error) });
    }
  }

  const ok = results.length > 0 && results.every((result) => result.status === 'written');
  return response(ok, results, ok ? undefined : 'One or more artifacts were rejected.');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The repository export failed unexpectedly.';
}

function writeJson(
  responseObject: ServerResponse,
  statusCode: number,
  body: ForgeBridgeResponse,
  origin?: string,
): void {
  responseObject.writeHead(statusCode, {
    ...(origin === undefined ? {} : { 'access-control-allow-origin': origin, vary: 'Origin' }),
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8',
  });
  responseObject.end(JSON.stringify(body));
}

export function createForgeBridgeAuthToken(): string {
  return randomBytes(32).toString('base64url');
}

function hasValidAuthToken(request: IncomingMessage, expectedToken: string): boolean {
  const authorization = request.headers[FORGE_BRIDGE_AUTH_HEADER];
  const headerToken = request.headers[FORGE_BRIDGE_TOKEN_HEADER];
  const providedToken =
    typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : typeof headerToken === 'string'
        ? headerToken
        : undefined;
  if (providedToken === undefined) return false;

  const expectedBytes = Buffer.from(expectedToken);
  const providedBytes = Buffer.from(providedToken);
  return expectedBytes.byteLength === providedBytes.byteLength && timingSafeEqual(expectedBytes, providedBytes);
}

async function readBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes)
      throw { statusCode: 413, message: `The request exceeds the ${maxBytes}-byte size limit.` } satisfies HttpError;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleHttpRequest(
  request: IncomingMessage,
  responseObject: ServerResponse,
  options: ForgeBridgeServerOptions,
  authToken: string,
  allowedOrigin: string,
): Promise<void> {
  const exportPath = options.exportPath ?? DEFAULT_EXPORT_PATH;
  const origin = request.headers.origin;
  if (origin !== allowedOrigin) {
    writeJson(responseObject, 403, response(false, [], 'The request origin is not allowed.'));
    return;
  }
  if (request.method === 'OPTIONS') {
    responseObject.writeHead(204, {
      'access-control-allow-origin': allowedOrigin,
      'access-control-allow-headers': `content-type, ${FORGE_BRIDGE_AUTH_HEADER}, ${FORGE_BRIDGE_TOKEN_HEADER}`,
      'access-control-allow-methods': 'POST, OPTIONS',
      vary: 'Origin',
    });
    responseObject.end();
    return;
  }
  if (request.method !== 'POST' || request.url !== exportPath) {
    writeJson(responseObject, 404, response(false, [], 'The requested bridge endpoint does not exist.'), allowedOrigin);
    return;
  }
  if (!hasValidAuthToken(request, authToken)) {
    writeJson(
      responseObject,
      401,
      response(false, [], 'The bridge authentication token is missing or invalid.'),
      allowedOrigin,
    );
    return;
  }

  try {
    const body = await readBody(request, options.maxRequestBytes ?? DEFAULT_MAX_REQUEST_BYTES);
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      writeJson(responseObject, 400, response(false, [], 'The bridge request body is not valid JSON.'), allowedOrigin);
      return;
    }
    if (!validRequest(payload)) {
      writeJson(
        responseObject,
        400,
        response(false, [], 'The bridge request is malformed or uses an unsupported protocol.'),
        allowedOrigin,
      );
      return;
    }
    const result = await exportForgeRepositoryBundle(payload, options);
    writeJson(responseObject, result.ok ? 200 : 409, result, allowedOrigin);
  } catch (error) {
    const httpError = isHttpError(error) ? error : undefined;
    writeJson(
      responseObject,
      httpError?.statusCode ?? 500,
      response(false, [], httpError?.message ?? errorMessage(error)),
      allowedOrigin,
    );
  }
}

function isHttpError(error: unknown): error is HttpError {
  return isRecord(error) && typeof error.statusCode === 'number' && typeof error.message === 'string';
}

export function createForgeBridgeServer(options: ForgeBridgeServerOptions): ForgeBridgeServer {
  const authToken = options.authToken ?? createForgeBridgeAuthToken();
  if (!authToken) throw new Error('The bridge authentication token must not be empty.');
  const allowedOrigin = options.allowedOrigin ?? DEFAULT_ALLOWED_ORIGIN;
  let server: ForgeBridgeServer;
  server = createServer((request, responseObject) => {
    void handleHttpRequest(request, responseObject, options, authToken, allowedOrigin);
  }) as ForgeBridgeServer;
  Object.defineProperties(server, {
    authToken: { configurable: false, enumerable: true, value: authToken, writable: false },
    allowedOrigin: { configurable: false, enumerable: true, value: allowedOrigin, writable: false },
  });
  return server;
}

export async function startForgeBridgeServer(
  options: ForgeBridgeServerOptions & { readonly host?: string; readonly port?: number },
): Promise<ForgeBridgeServer> {
  const server = createForgeBridgeServer(options);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(options.port ?? 8787, options.host ?? '127.0.0.1');
  });
  return server;
}
