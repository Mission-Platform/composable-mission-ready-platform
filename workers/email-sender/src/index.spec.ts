import { describe, expect, it, vi } from 'vitest';

import { handleRequest } from '.';

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}));

const environment = {
  MAILPIT_HOST: '127.0.0.1',
  MAILPIT_PORT: '1025',
  MAIL_FROM: 'showcase@mission.local',
  MAILPIT_UI_URL: 'http://localhost:8025',
} satisfies Env;

const completedHtml =
  '<!doctype html><html><head><title>Mission Platform email showcase</title></head><body><table><tr><td>Welcome, Ada</td></tr></table></body></html>';

function request(path: string, body: unknown, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
}

describe('email sender Worker', () => {
  it('forwards the completed example-rendered HTML without rendering another template', async () => {
    const delivery = vi.fn().mockResolvedValue();
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
    const delivery = vi.fn().mockResolvedValue();

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
    const delivery = vi.fn().mockResolvedValue();
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
    const delivery = vi.fn().mockRejectedValue(new Error('connection refused'));
    const response = await handleRequest(
      request('/api/email/send', { html: completedHtml, to: 'ada@example.com', recipientName: 'Ada' }),
      environment,
      delivery,
    );

    expect(response.status).toBe(502);
    const result = await response.json();
    expect(result).toEqual({ ok: false, error: 'MailPit delivery failed. Is the local SMTP service running?' });
  });
});
