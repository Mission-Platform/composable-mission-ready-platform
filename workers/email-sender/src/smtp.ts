import { connect } from 'cloudflare:sockets';

export interface SmtpMessage {
  readonly from: string;
  readonly html: string;
  readonly subject: string;
  readonly to: string;
}

export interface SmtpOptions {
  readonly host: string;
  readonly port: number;
}

interface SmtpSocket {
  readonly opened: Promise<unknown>;
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
  close(): void;
}

type SocketConnector = (address: { hostname: string; port: number }) => SmtpSocket;

interface ReaderState {
  buffer: string;
  readonly decoder: TextDecoder;
}

async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>, state: ReaderState): Promise<string> {
  while (true) {
    const end = state.buffer.indexOf('\r\n');
    if (end !== -1) {
      const line = state.buffer.slice(0, end);
      state.buffer = state.buffer.slice(end + 2);
      return line;
    }
    const result = await reader.read();
    if (result.done) throw new Error('SMTP connection closed before a complete response was received');
    state.buffer += state.decoder.decode(result.value, { stream: true });
  }
}

async function expectResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: ReaderState,
  expected: number,
): Promise<void> {
  const firstLine = await readLine(reader, state);
  const code = Number.parseInt(firstLine.slice(0, 3), 10);
  if (code !== expected) throw new Error(`SMTP expected ${expected}, received: ${firstLine}`);
  if (firstLine[3] === '-') {
    let line = firstLine;
    while (line.slice(0, 3) === firstLine.slice(0, 3) && line[3] !== ' ') line = await readLine(reader, state);
  }
}

async function sendCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: ReaderState,
  command: string,
  expected: number,
): Promise<void> {
  await writer.write(new TextEncoder().encode(`${command}\r\n`));
  await expectResponse(reader, state, expected);
}

function formatMessage(message: SmtpMessage): string {
  const body = message.html.replaceAll(/\r?\n/g, '\r\n').replaceAll(/^\./gm, '..');
  return [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
    '.',
    '',
  ].join('\r\n');
}

export async function sendSmtpMessage(
  options: SmtpOptions,
  message: SmtpMessage,
  connector: SocketConnector = (address) => connect(address),
): Promise<void> {
  const socket = connector({ hostname: options.host, port: options.port });
  await socket.opened;
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const state: ReaderState = { buffer: '', decoder: new TextDecoder() };

  try {
    await expectResponse(reader, state, 220);
    await sendCommand(writer, reader, state, 'EHLO mission-platform.local', 250);
    await sendCommand(writer, reader, state, `MAIL FROM:<${message.from}>`, 250);
    await sendCommand(writer, reader, state, `RCPT TO:<${message.to}>`, 250);
    await sendCommand(writer, reader, state, 'DATA', 354);
    await writer.write(new TextEncoder().encode(formatMessage(message)));
    await expectResponse(reader, state, 250);
    await sendCommand(writer, reader, state, 'QUIT', 221);
  } finally {
    writer.releaseLock();
    reader.releaseLock();
    socket.close();
  }
}
