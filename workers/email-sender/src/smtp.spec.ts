import { describe, expect, it, vi } from 'vitest';

import { sendSmtpMessage, type SmtpMessage } from './smtp';

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}));

interface SocketOverrides {
  readonly opened?: Promise<unknown>;
  readonly readable?: ReadableStream<Uint8Array>;
  readonly writable?: WritableStream<Uint8Array>;
}

function createSocket(overrides: SocketOverrides = {}) {
  const responses = [
    '220 mailpit ESMTP\r\n',
    '250-mailpit\r\n250-8BITMIME\r\n250 OK\r\n',
    '250 OK\r\n',
    '250 OK\r\n',
    '354 End data with <CR><LF>.<CR><LF>\r\n',
    '250 OK\r\n',
    '221 Bye\r\n',
  ];
  const writes: string[] = [];
  const encoder = new TextEncoder();
  const readable =
    overrides.readable ??
    new ReadableStream<Uint8Array>({
      pull(controller) {
        const response = responses.shift();
        if (response) controller.enqueue(encoder.encode(response));
        else controller.close();
      },
    });
  const writable =
    overrides.writable ??
    new WritableStream<Uint8Array>({
      write(chunk) {
        writes.push(new TextDecoder().decode(chunk));
      },
    });
  return { opened: overrides.opened ?? Promise.resolve(), readable, writable, close: vi.fn(), writes };
}

const message: SmtpMessage = {
  from: 'showcase@mission.local',
  html: '<p>Hello</p>',
  subject: 'Showcase',
  to: 'ada@example.com',
};

describe('SMTP transport', () => {
  it('performs a complete MailPit-compatible SMTP exchange', async () => {
    const socket = createSocket();

    await sendSmtpMessage({ host: '127.0.0.1', port: 1025 }, message, () => socket);

    expect(socket.writes).toEqual([
      'EHLO mission-platform.local\r\n',
      'MAIL FROM:<showcase@mission.local>\r\n',
      'RCPT TO:<ada@example.com>\r\n',
      'DATA\r\n',
      'From: showcase@mission.local\r\nTo: ada@example.com\r\nSubject: Showcase\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<p>Hello</p>\r\n.\r\n',
      'QUIT\r\n',
    ]);
  });

  it('times out while opening and closes the socket', async () => {
    const socket = createSocket({ opened: new Promise(() => {}) });

    await expect(
      sendSmtpMessage({ host: '127.0.0.1', port: 1025, timeoutMs: 1 }, message, () => socket),
    ).rejects.toThrow('SMTP open timed out');

    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('times out while reading and closes the socket', async () => {
    const socket = createSocket({
      readable: new ReadableStream<Uint8Array>({
        pull() {},
      }),
    });

    await expect(
      sendSmtpMessage({ host: '127.0.0.1', port: 1025, timeoutMs: 1 }, message, () => socket),
    ).rejects.toThrow('SMTP read timed out');

    expect(socket.close).toHaveBeenCalledOnce();
  });

  it('times out while writing and closes the socket', async () => {
    const socket = createSocket({
      writable: new WritableStream<Uint8Array>({
        write() {
          return new Promise(() => {});
        },
      }),
    });

    await expect(
      sendSmtpMessage({ host: '127.0.0.1', port: 1025, timeoutMs: 1 }, message, () => socket),
    ).rejects.toThrow('SMTP write timed out');

    expect(socket.close).toHaveBeenCalledOnce();
  });
});
