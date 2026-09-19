import { applySecurityHeaders, withSecurityHeaders } from '@mission-platform/edge-security';
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

/**
 * Checks whether an ASCII character code represents a control character (0x00-0x1F, 0x7F).
 *
 * @param code - Character code to check.
 * @returns True if control code.
 */
function isControlCode(code: number | undefined): boolean {
  return typeof code === 'number' && (code < 32 || code === 127);
}

/**
 * Checks whether a string contains ASCII control characters (0x00-0x1F, 0x7F).
 *
 * @param text - The string to check.
 * @returns True if control characters are present.
 */
function hasControlCharacters(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (isControlCode(text.codePointAt(index))) return true;
  }
  return false;
}

/**
 * Creates a JSON HTTP Response decorated with standard security headers and no-store caching.
 *
 * @param body - Serialized response payload.
 * @param status - HTTP response status code.
 * @returns Secured Response object.
 */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return applySecurityHeaders(Response.json(body, { status, headers: { 'cache-control': 'no-store' } }));
}

/**
 * Creates an error JSON response with { ok: false, error }.
 *
 * @param error - Error explanation message.
 * @param status - HTTP status code.
 * @returns Secured Response object.
 */
function errorResponse(error: string, status: number): Response {
  return jsonResponse({ ok: false, error }, status);
}

/**
 * Concatenates an array of byte chunks into a single Uint8Array.
 *
 * @param chunks - Array of byte buffers.
 * @param total - Total byte length.
 * @returns Consolidated byte array.
 */
function concatChunks(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * Reads the request stream into a UTF-8 string, capping execution if maximum body size is exceeded.
 *
 * @param request - Incoming HTTP request.
 * @returns Decoded UTF-8 string.
 */
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
  return new TextDecoder().decode(concatChunks(chunks, total));
}

/**
 * Validates the recipient email address format and length.
 *
 * @param to - Recipient email value.
 * @returns Validated recipient email string.
 */
function validateRecipientEmail(to: unknown): string {
  if (typeof to !== 'string' || to.length > 254 || !EMAIL_PATTERN.test(to)) {
    throw new Error('A valid recipient email address is required');
  }
  if (/[\r\n]/u.test(to)) {
    throw new Error('Recipient fields contain unsupported characters');
  }
  return to;
}

/**
 * Validates recipient display name length and character content.
 *
 * @param recipientName - Recipient name value.
 * @returns Trimmed recipient display name.
 */
function validateRecipientName(recipientName: unknown): string {
  if (typeof recipientName !== 'string' || recipientName.length > 100) {
    throw new Error('A recipient name between 1 and 100 characters is required');
  }
  const trimmed = recipientName.trim();
  if (trimmed.length === 0) {
    throw new Error('A recipient name between 1 and 100 characters is required');
  }
  if (hasControlCharacters(trimmed)) {
    throw new Error('Recipient fields contain unsupported characters');
  }
  return trimmed;
}

/**
 * Validates recipient email address and recipient name fields.
 *
 * @param to - Recipient email string.
 * @param recipientName - Recipient display name string.
 * @returns Cleaned recipient payload.
 */
function validateRecipient(to: unknown, recipientName: unknown): { to: string; recipientName: string } {
  return {
    to: validateRecipientEmail(to),
    recipientName: validateRecipientName(recipientName),
  };
}

/**
 * Validates the email HTML markup content.
 *
 * @param html - Raw HTML markup string.
 * @returns Validated HTML string.
 */
function validateHtml(html: unknown): string {
  if (typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('Completed email HTML is required');
  }
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
    throw new Error('Completed email HTML is too large');
  }
  try {
    assertCompatibleEmailHtml(html);
  } catch {
    throw new Error('Completed email HTML is not compatible with the email output policy');
  }
  return html;
}

/**
 * Parses and validates raw JSON input against the email request contract.
 *
 * @param value - Unvalidated parsed JSON value.
 * @returns Strongly typed EmailRequest.
 */
function parseEmailRequest(value: unknown): EmailRequest {
  if (!value || typeof value !== 'object') throw new Error('Request must be a JSON object');
  const input = value as Record<string, unknown>;
  const { to, recipientName } = validateRecipient(input.to, input.recipientName);
  const html = validateHtml(input.html);
  return { html, recipientName, to };
}

/**
 * Verifies that the request Content-Type is application/json and body length is within limits.
 *
 * @param request - Incoming HTTP request.
 */
function validateJsonContentType(request: Request): void {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new Error('Content-Type must be application/json');
  }
  const length = request.headers.get('content-length');
  if (length && Number(length) > MAX_BODY_BYTES) {
    throw new Error('Request body is too large');
  }
}

/**
 * Parses the incoming HTTP request body into a validated EmailRequest.
 *
 * @param request - Incoming HTTP request.
 * @returns Validated EmailRequest object.
 */
async function parseRequest(request: Request): Promise<EmailRequest> {
  validateJsonContentType(request);
  let value: unknown;
  try {
    value = JSON.parse(await readBody(request));
  } catch (error) {
    if (error instanceof Error && error.message === 'Request body is too large') throw error;
    throw new Error('Request body must contain valid JSON');
  }
  return parseEmailRequest(value);
}

/**
 * Checks whether an incoming request originates from a local loopback hostname.
 *
 * @param request - Incoming HTTP request.
 * @returns True if request protocol is http: and host is loopback.
 */
function isLocalRequest(request: Request): boolean {
  const { hostname, protocol } = new URL(request.url);
  return protocol === 'http:' && isLoopbackHostname(hostname);
}

/**
 * Parses a comma-separated list of policy tokens into a normalized Set of lowercase strings.
 *
 * @param value - Raw policy environment string.
 * @returns Set of lowercase allowed values.
 */
function parsePolicyList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

/**
 * Compares two strings in constant time to prevent side-channel timing attacks.
 *
 * @param left - First string.
 * @param right - Second string.
 * @returns True if both strings are identical.
 */
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

/**
 * Extracts a Bearer token from the Authorization header value.
 *
 * @param authorization - Raw Authorization header string or null.
 * @returns Extracted token or empty string.
 */
function extractBearerToken(authorization: string | null): string {
  if (!authorization || !authorization.startsWith('Bearer ')) return '';
  return authorization.slice('Bearer '.length).trim();
}

/**
 * Verifies deployment token authentication for non-local requests.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment bindings.
 * @param localRequest - True if the request originates from localhost.
 * @returns True if deployment authorization is satisfied.
 */
function isAuthorizedDeployment(request: Request, environment: WorkerEnvironment, localRequest: boolean): boolean {
  if (localRequest) return true;
  const expectedToken = environment.EMAIL_DEPLOYMENT_TOKEN;
  const token = extractBearerToken(request.headers.get('authorization'));
  return Boolean(expectedToken) && Boolean(token) && constantTimeEqual(token, expectedToken ?? '');
}

/**
 * Validates whether the request Origin header matches allowed origins policy.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment bindings.
 * @param localRequest - True if local loopback request.
 * @returns True if the origin is permitted.
 */
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

/**
 * Validates whether the recipient email is permitted by policy.
 *
 * @param input - Validated email request.
 * @param environment - Worker environment bindings.
 * @param localRequest - True if local loopback request.
 * @returns True if recipient is permitted.
 */
function isAllowedRecipient(input: EmailRequest, environment: WorkerEnvironment, localRequest: boolean): boolean {
  const allowedRecipients = parsePolicyList(environment.EMAIL_ALLOWED_RECIPIENTS);
  return localRequest
    ? allowedRecipients.size === 0 || allowedRecipients.has(input.to.toLowerCase())
    : allowedRecipients.has(input.to.toLowerCase());
}

/**
 * Enforces rate limiting against the client IP address.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment bindings.
 * @returns 'allowed', 'limited', or 'unconfigured'.
 */
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

/**
 * Checks whether a hostname matches loopback network addresses.
 *
 * @param hostname - Hostname to evaluate.
 * @returns True if loopback address.
 */
function isLoopbackHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

/**
 * Validates that the MailPit port is a valid positive integer in the valid range.
 *
 * @param port - Numerical port value.
 * @returns True if port is within 1..65535.
 */
function isValidMailPitPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65_535;
}

/**
 * Default delivery implementation forwarding messages to local MailPit instance via SMTP.
 *
 * @param environment - Worker environment containing host and port.
 * @param message - Prepared SMTP message.
 */
const defaultDelivery: Delivery = async (environment, message) => {
  const port = Number.parseInt(environment.MAILPIT_PORT, 10);
  if (!environment.MAILPIT_HOST || !isLoopbackHostname(environment.MAILPIT_HOST) || !isValidMailPitPort(port)) {
    throw new Error('MailPit SMTP configuration is invalid');
  }
  await sendSmtpMessage({ host: environment.MAILPIT_HOST, port }, message);
};

/**
 * Validates authorization, origin, and rate limiting policies for an incoming email request.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment.
 * @param localRequest - True if local loopback request.
 * @returns Error Response if policy check fails, or undefined if permitted.
 */
async function validateRequestPolicy(
  request: Request,
  environment: WorkerEnvironment,
  localRequest: boolean,
): Promise<Response | undefined> {
  if (!isAuthorizedDeployment(request, environment, localRequest)) {
    return errorResponse('Email delivery is not authorized for this deployment', 401);
  }
  if (!isAllowedOrigin(request, environment, localRequest)) {
    return errorResponse('Email delivery origin is not allowed', 403);
  }
  const rateLimit = await enforceRateLimit(request, environment);
  if (rateLimit === 'unconfigured') return errorResponse('Email delivery rate limiting is not configured', 503);
  if (rateLimit === 'limited') return errorResponse('Email delivery rate limit exceeded', 429);
  return undefined;
}

/**
 * Validates request HTTP method and URL pathname.
 *
 * @param request - Incoming HTTP request.
 * @returns Error Response if invalid method or path, or undefined if valid.
 */
function validateRequestMethodAndPath(request: Request): Response | undefined {
  const pathname = new URL(request.url).pathname;
  if (pathname !== '/api/email/send') return errorResponse('Not found', 404);
  if (request.method !== 'POST') return errorResponse('Only POST is supported', 405);
  return undefined;
}

/**
 * Safely parses request body into EmailRequest or returns an error response.
 *
 * @param request - Incoming HTTP request.
 * @returns Parsed email request or error response.
 */
async function parseEmailRequestBody(request: Request): Promise<{ input?: EmailRequest; errorResponse?: Response }> {
  try {
    const input = await parseRequest(request);
    return { input };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return { errorResponse: errorResponse(message, 400) };
  }
}

/**
 * Dispatches message to the delivery provider and formats the outcome response.
 *
 * @param environment - Worker environment.
 * @param input - Validated email request.
 * @param delivery - Delivery provider function.
 * @returns Resulting HTTP response.
 */
async function dispatchEmailDelivery(
  environment: WorkerEnvironment,
  input: EmailRequest,
  delivery: Delivery,
): Promise<Response> {
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

/**
 * Validates request routing, security policies, and caller authorization.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment.
 * @param localRequest - True if local loopback request.
 * @returns Error Response if validation fails, or undefined if authorized.
 */
async function validateRequestPreconditions(
  request: Request,
  environment: WorkerEnvironment,
  localRequest: boolean,
): Promise<Response | undefined> {
  const methodPathError = validateRequestMethodAndPath(request);
  if (methodPathError) return methodPathError;
  return await validateRequestPolicy(request, environment, localRequest);
}

/**
 * Parses request body and verifies recipient authorization.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment.
 * @param localRequest - True if local loopback request.
 * @returns Result containing either a validated EmailRequest or an error Response.
 */
async function resolveValidatedInput(
  request: Request,
  environment: WorkerEnvironment,
  localRequest: boolean,
): Promise<{ input: EmailRequest; errorResponse?: undefined } | { input?: undefined; errorResponse: Response }> {
  const { input, errorResponse: parseError } = await parseEmailRequestBody(request);
  if (parseError) return { errorResponse: parseError };
  if (!input) return { errorResponse: errorResponse('Invalid request', 400) };
  if (!isAllowedRecipient(input, environment, localRequest)) {
    return { errorResponse: errorResponse('Email recipient is not allowed', 403) };
  }
  return { input };
}

/**
 * Handles incoming email delivery requests, validating input and delivering to SMTP service.
 *
 * @param request - Incoming HTTP request.
 * @param environment - Worker environment bindings.
 * @param delivery - Delivery function handling message transmission.
 * @returns HTTP Response.
 */
export async function handleRequest(
  request: Request,
  environment: WorkerEnvironment,
  delivery: Delivery = defaultDelivery,
): Promise<Response> {
  const localRequest = isLocalRequest(request);
  const preconditionError = await validateRequestPreconditions(request, environment, localRequest);
  if (preconditionError) return preconditionError;

  const resolution = await resolveValidatedInput(request, environment, localRequest);
  if (resolution.errorResponse) return resolution.errorResponse;

  return dispatchEmailDelivery(environment, resolution.input, delivery);
}

export default withSecurityHeaders({
  fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    return handleRequest(request, environment);
  },
}) satisfies ExportedHandler<WorkerEnvironment>;
