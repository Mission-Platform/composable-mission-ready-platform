import { assertCompatibleEmailHtml } from '@mission-platform/email-components';

import { sendSmtpMessage, type SmtpMessage } from './smtp';

const EMAIL_SUBJECT = 'Mission Platform email showcase';
const MAX_BODY_BYTES = 256 * 1024;
const MAX_HTML_BYTES = 240 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailRequest {
  readonly html: string;
  readonly recipientName: string;
  readonly to: string;
}

export type Delivery = (environment: Env, message: SmtpMessage) => Promise<void>;

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

const defaultDelivery: Delivery = async (environment, message) => {
  const port = Number.parseInt(environment.MAILPIT_PORT, 10);
  if (!environment.MAILPIT_HOST || !Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('MailPit SMTP configuration is invalid');
  }
  await sendSmtpMessage({ host: environment.MAILPIT_HOST, port }, message);
};

export async function handleRequest(
  request: Request,
  environment: Env,
  delivery: Delivery = defaultDelivery,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname !== '/api/email/send') return errorResponse('Not found', 404);
  if (request.method !== 'POST') return errorResponse('Only POST is supported', 405);

  let input: EmailRequest;
  try {
    input = await parseRequest(request);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Invalid request', 400);
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
