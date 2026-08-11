import { describe, expect, it, vi } from 'vitest';

import { sendSmtpMessage, type SmtpMessage } from './smtp';

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}));

function createSocket() {
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
  const readable = new ReadableStream<Uint8Array>({
    pull(controller) {
      const response = responses.shift();
      if (response) controller.enqueue(encoder.encode(response));
      else controller.close();
    },
  });
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      writes.push(new TextDecoder().decode(chunk));
    },
  });
  return { opened: Promise.resolve(), readable, writable, close: () => {}, writes };
}

describe('SMTP transport', () => {
  it('performs a complete MailPit-compatible SMTP exchange', async () => {
    const socket = createSocket();
    const message: SmtpMessage = {
      from: 'showcase@mission.local',
      html: '<p>Hello</p>',
      subject: 'Showcase',
      to: 'ada@example.com',
    };

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
});
