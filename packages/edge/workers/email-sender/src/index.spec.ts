import { describe, expect, it, vi } from 'vitest';

import { handleRequest, type Delivery } from '.';

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}));

const environment = {
  EMAIL_RATE_LIMITER: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
  MAILPIT_HOST: '127.0.0.1',
  MAILPIT_PORT: '1025',
  MAIL_FROM: 'showcase@mission.local',
  MAILPIT_UI_URL: 'http://localhost:8025',
};

const deployedEnvironment = {
  ...environment,
  EMAIL_ALLOWED_ORIGINS: 'https://showcase.example.com',
  EMAIL_ALLOWED_RECIPIENTS: 'ada@example.com',
  EMAIL_DEPLOYMENT_TOKEN: 'deployment-secret',
  EMAIL_RATE_LIMITER: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
};

const completedHtml =
  '<!doctype html><html><head><title>Mission Platform email showcase</title></head><body><table><tr><td>Welcome, Ada</td></tr></table></body></html>';

function request(path: string, body: unknown, init: RequestInit = {}, baseUrl = 'http://localhost'): Request {
  return new Request(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
}

function successfulDelivery() {
  return vi.fn<Delivery>(async () => {});
}

function failingDelivery() {
  return vi.fn<Delivery>(async () => {
    throw new Error('connection refused');
  });
}

describe('email sender Worker', () => {
  it('forwards the completed example-rendered HTML without rendering another template', async () => {
    const delivery = successfulDelivery();
    const response = await handleRequest(
      request('/api/email/send', { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' }),
      environment,
      delivery,
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toEqual({ ok: true, message: 'Email delivered to MailPit.' });
    expect(delivery).toHaveBeenCalledOnce();
    expect(delivery.mock.calls[0]?.[1].html).toBe(completedHtml);
  });

  it('rejects invalid methods, paths, payloads, and content types without delivery', async () => {
    const delivery = successfulDelivery();

    const methodResponse = await handleRequest(new Request('http://localhost/api/email/send'), environment, delivery);
    const pathResponse = await handleRequest(request('/api/unknown', {}), environment, delivery);
    const payloadResponse = await handleRequest(
      request('/api/email/send', { html: completedHtml, to: 'not-an-email', recipientName: 'Ada' }),
      environment,
      delivery,
    );
    const contentTypeResponse = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' },
        { headers: { 'content-type': 'text/plain' } },
      ),
      environment,
      delivery,
    );

    expect(methodResponse.status).toBe(405);
    expect(pathResponse.status).toBe(404);
    expect(payloadResponse.status).toBe(400);
    expect(contentTypeResponse.status).toBe(400);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('rejects incomplete or incompatible completed HTML without delivery', async () => {
    const delivery = successfulDelivery();
    const missingHtmlResponse = await handleRequest(
      request('/api/email/send', { to: 'ada@example.com', recipientName: 'Ada' }),
      environment,
      delivery,
    );
    const incompatibleHtmlResponse = await handleRequest(
      request('/api/email/send', { html: '<script>alert(1)</script>', to: 'ada@example.com', recipientName: 'Ada' }),
      environment,
      delivery,
    );

    expect(missingHtmlResponse.status).toBe(400);
    expect(incompatibleHtmlResponse.status).toBe(400);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('returns a gateway error when MailPit delivery fails', async () => {
    const delivery = failingDelivery();
    const response = await handleRequest(
      request('/api/email/send', { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' }),
      environment,
      delivery,
    );

    expect(response.status).toBe(502);
    const result = await response.json();
    expect(result).toEqual({ ok: false, error: 'MailPit delivery failed. Is the local SMTP service running?' });
  });

  it('requires deployment authorization for non-local requests', async () => {
    const delivery = successfulDelivery();
    const response = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' },
        {
          headers: { 'content-type': 'application/json', origin: 'https://showcase.example.com' },
        },
        'https://showcase.example.com',
      ),
      deployedEnvironment,
      delivery,
    );

    expect(response.status).toBe(401);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('enforces the configured origin and recipient policy for deployed requests', async () => {
    const delivery = successfulDelivery();
    const response = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'other@example.com', recipientName: 'Ada' },
        {
          headers: {
            authorization: 'Bearer deployment-secret',
            'content-type': 'application/json',
            origin: 'https://evil.example.com',
          },
        },
        'https://showcase.example.com',
      ),
      deployedEnvironment,
      delivery,
    );

    expect(response.status).toBe(403);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('rejects a recipient outside the configured deployed allowlist', async () => {
    const delivery = successfulDelivery();
    const response = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'other@example.com', recipientName: 'Ada' },
        {
          headers: {
            authorization: 'Bearer deployment-secret',
            'content-type': 'application/json',
            origin: 'https://showcase.example.com',
          },
        },
        'https://showcase.example.com',
      ),
      deployedEnvironment,
      delivery,
    );

    expect(response.status).toBe(403);
    expect(delivery).not.toHaveBeenCalled();
  });

  it('allows an authorized deployed request within the configured policies', async () => {
    const delivery = successfulDelivery();
    const response = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' },
        {
          headers: {
            authorization: 'Bearer deployment-secret',
            'content-type': 'application/json',
            origin: 'https://showcase.example.com',
          },
        },
        'https://showcase.example.com',
      ),
      deployedEnvironment,
      delivery,
    );

    expect(response.status).toBe(200);
    expect(delivery).toHaveBeenCalledOnce();
  });

  it('rejects deployed requests when the rate limiter denies them', async () => {
    const delivery = successfulDelivery();
    const rateLimiter = { limit: vi.fn().mockResolvedValue({ success: false }) };
    const response = await handleRequest(
      request(
        '/api/email/send',
        { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' },
        {
          headers: {
            authorization: 'Bearer deployment-secret',
            'content-type': 'application/json',
            origin: 'https://showcase.example.com',
          },
        },
        'https://showcase.example.com',
      ),
      { ...deployedEnvironment, EMAIL_RATE_LIMITER: rateLimiter } as Env,
      delivery,
    );

    expect(response.status).toBe(429);
    expect(delivery).not.toHaveBeenCalled();
  });
});
