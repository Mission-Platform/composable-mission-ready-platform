import { assertCompatibleEmailHtml } from '@mission-platform/email-components';

import { sendSmtpMessage, type SmtpMessage } from './smtp';

const EMAIL_SUBJECT = 'Mission Platform email showcase';
const MAX_BODY_BYTES = 256 * 1024;
const MAX_HTML_BYTES = 240 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://[::1]:5173', 'http://localhost:5173']);

export interface EmailRequest {
  readonly html: string;
  readonly recipientName: string;
  readonly to: string;
}

interface RateLimiterBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

interface EmailPolicyEnvironment {
  readonly EMAIL_ALLOWED_ORIGINS?: string;
  readonly EMAIL_ALLOWED_RECIPIENTS?: string;
  readonly EMAIL_DEPLOYMENT_TOKEN?: string;
  readonly EMAIL_RATE_LIMITER?: RateLimiterBinding;
}

interface SmtpEnvironment {
  readonly MAILPIT_HOST: string;
  readonly MAILPIT_PORT: string;
  readonly MAIL_FROM: string;
  readonly MAILPIT_UI_URL: string;
}

type WorkerEnvironment = SmtpEnvironment & EmailPolicyEnvironment;

export type Delivery = (environment: WorkerEnvironment, message: SmtpMessage) => Promise<void>;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ ok: false, error }, status);
}

async function readBody(request: Request): Promise<string> {
  if (!request.body) throw new Error('Request body is required');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_BODY_BYTES) throw new Error('Request body is too large');
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function parseEmailRequest(value: unknown): EmailRequest {
  if (!value || typeof value !== 'object') throw new Error('Request must be a JSON object');
  const input = value as Record<string, unknown>;
  if (typeof input.to !== 'string' || !EMAIL_PATTERN.test(input.to) || input.to.length > 254) {
    throw new Error('A valid recipient email address is required');
  }
  if (
    typeof input.recipientName !== 'string' ||
    input.recipientName.trim().length === 0 ||
    input.recipientName.length > 100
  ) {
    throw new Error('A recipient name between 1 and 100 characters is required');
  }
  if (typeof input.html !== 'string' || input.html.trim().length === 0) {
    throw new Error('Completed email HTML is required');
  }
  if (new TextEncoder().encode(input.html).byteLength > MAX_HTML_BYTES) {
    throw new Error('Completed email HTML is too large');
  }
  if (/[\r\n]/.test(input.to) || /[\u0000-\u001F\u007F]/.test(input.recipientName)) {
    throw new Error('Recipient fields contain unsupported characters');
  }
  try {
    assertCompatibleEmailHtml(input.html);
  } catch {
    throw new Error('Completed email HTML is not compatible with the email output policy');
  }
  return { html: input.html, recipientName: input.recipientName.trim(), to: input.to };
}

async function parseRequest(request: Request): Promise<EmailRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json'))
    throw new Error('Content-Type must be application/json');
  const length = request.headers.get('content-length');
  if (length && Number(length) > MAX_BODY_BYTES) throw new Error('Request body is too large');
  let value: unknown;
  try {
    value = JSON.parse(await readBody(request));
  } catch (error) {
    if (error instanceof Error && error.message === 'Request body is too large') throw error;
    throw new Error('Request body must contain valid JSON');
  }
  return parseEmailRequest(value);
}

function isLocalRequest(request: Request): boolean {
  const { hostname, protocol } = new URL(request.url);
  return protocol === 'http:' && isLoopbackHostname(hostname);
}

function parsePolicyList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function isAuthorizedDeployment(request: Request, environment: WorkerEnvironment, localRequest: boolean): boolean {
  if (localRequest) return true;
  const expectedToken = environment.EMAIL_DEPLOYMENT_TOKEN;
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  return Boolean(expectedToken) && Boolean(token) && constantTimeEqual(token, expectedToken ?? '');
}

function isAllowedOrigin(request: Request, environment: WorkerEnvironment, localRequest: boolean): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return localRequest;
  const allowedOrigins = parsePolicyList(environment.EMAIL_ALLOWED_ORIGINS);
  return localRequest
    ? allowedOrigins.size > 0
      ? allowedOrigins.has(origin.toLowerCase())
      : LOCAL_ORIGINS.has(origin.toLowerCase())
    : allowedOrigins.has(origin.toLowerCase());
}

function isAllowedRecipient(input: EmailRequest, environment: WorkerEnvironment, localRequest: boolean): boolean {
  const allowedRecipients = parsePolicyList(environment.EMAIL_ALLOWED_RECIPIENTS);
  return localRequest
    ? allowedRecipients.size === 0 || allowedRecipients.has(input.to.toLowerCase())
    : allowedRecipients.has(input.to.toLowerCase());
}

async function enforceRateLimit(
  request: Request,
  environment: WorkerEnvironment,
): Promise<'allowed' | 'limited' | 'unconfigured'> {
  const limiter = environment.EMAIL_RATE_LIMITER;
  if (!limiter) return 'unconfigured';
  const client = request.headers.get('CF-Connecting-IP') ?? 'anonymous';
  try {
    const result = await limiter.limit({ key: `email-send:${client}` });
    return result.success ? 'allowed' : 'limited';
  } catch {
    return 'unconfigured';
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

const defaultDelivery: Delivery = async (environment, message) => {
  const port = Number.parseInt(environment.MAILPIT_PORT, 10);
  if (
    !environment.MAILPIT_HOST ||
    !isLoopbackHostname(environment.MAILPIT_HOST) ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535
  ) {
    throw new Error('MailPit SMTP configuration is invalid');
  }
  await sendSmtpMessage({ host: environment.MAILPIT_HOST, port }, message);
};

export async function handleRequest(
  request: Request,
  environment: WorkerEnvironment,
  delivery: Delivery = defaultDelivery,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname !== '/api/email/send') return errorResponse('Not found', 404);
  if (request.method !== 'POST') return errorResponse('Only POST is supported', 405);

  const localRequest = isLocalRequest(request);
  if (!isAuthorizedDeployment(request, environment, localRequest)) {
    return errorResponse('Email delivery is not authorized for this deployment', 401);
  }
  if (!isAllowedOrigin(request, environment, localRequest)) {
    return errorResponse('Email delivery origin is not allowed', 403);
  }
  const rateLimit = await enforceRateLimit(request, environment);
  if (rateLimit === 'unconfigured') return errorResponse('Email delivery rate limiting is not configured', 503);
  if (rateLimit === 'limited') return errorResponse('Email delivery rate limit exceeded', 429);

  let input: EmailRequest;
  try {
    input = await parseRequest(request);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Invalid request', 400);
  }
  if (!isAllowedRecipient(input, environment, localRequest)) {
    return errorResponse('Email recipient is not allowed', 403);
  }

  try {
    await delivery(environment, {
      from: environment.MAIL_FROM,
      html: input.html,
      subject: EMAIL_SUBJECT,
      to: input.to,
    });
    return jsonResponse({ ok: true, message: 'Email delivered to MailPit.' });
  } catch (error) {
    console.error('MailPit delivery failed', error);
    return errorResponse('MailPit delivery failed. Is the local SMTP service running?', 502);
  }
}

export default {
  fetch(request: Request, environment: Env): Promise<Response> {
    return handleRequest(request, environment);
  },
} satisfies ExportedHandler<Env>;
