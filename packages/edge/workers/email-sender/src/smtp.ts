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
  readonly timeoutMs?: number;
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

const DEFAULT_TIMEOUT_MS = 10_000;

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`SMTP ${operationName} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function readLine(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: ReaderState,
  timeoutMs: number,
): Promise<string> {
  while (true) {
    const end = state.buffer.indexOf('\r\n');
    if (end !== -1) {
      const line = state.buffer.slice(0, end);
      state.buffer = state.buffer.slice(end + 2);
      return line;
    }
    const result = await withTimeout(reader.read(), timeoutMs, 'read');
    if (result.done) throw new Error('SMTP connection closed before a complete response was received');
    state.buffer += state.decoder.decode(result.value, { stream: true });
  }
}

async function expectResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: ReaderState,
  expected: number,
  timeoutMs: number,
): Promise<void> {
  const firstLine = await readLine(reader, state, timeoutMs);
  const code = Number.parseInt(firstLine.slice(0, 3), 10);
  if (code !== expected) throw new Error(`SMTP expected ${expected}, received: ${firstLine}`);
  if (firstLine[3] === '-') {
    let line = firstLine;
    while (line.slice(0, 3) === firstLine.slice(0, 3) && line[3] !== ' ')
      line = await readLine(reader, state, timeoutMs);
  }
}

async function sendCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  state: ReaderState,
  command: string,
  expected: number,
  timeoutMs: number,
): Promise<void> {
  await withTimeout(writer.write(new TextEncoder().encode(`${command}\r\n`)), timeoutMs, 'write');
  await expectResponse(reader, state, expected, timeoutMs);
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
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('SMTP timeout must be a positive finite number');
  const socket = connector({ hostname: options.host, port: options.port });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;

  try {
    await withTimeout(socket.opened, timeoutMs, 'open');
    reader = socket.readable.getReader();
    writer = socket.writable.getWriter();
    const state: ReaderState = { buffer: '', decoder: new TextDecoder() };

    await expectResponse(reader, state, 220, timeoutMs);
    await sendCommand(writer, reader, state, 'EHLO mission-platform.local', 250, timeoutMs);
    await sendCommand(writer, reader, state, `MAIL FROM:<${message.from}>`, 250, timeoutMs);
    await sendCommand(writer, reader, state, `RCPT TO:<${message.to}>`, 250, timeoutMs);
    await sendCommand(writer, reader, state, 'DATA', 354, timeoutMs);
    await withTimeout(writer.write(new TextEncoder().encode(formatMessage(message))), timeoutMs, 'write');
    await expectResponse(reader, state, 250, timeoutMs);
    await sendCommand(writer, reader, state, 'QUIT', 221, timeoutMs);
  } finally {
    try {
      writer?.releaseLock();
    } catch {
      // The writer may already have been released by a failed stream operation.
    }
    try {
      reader?.releaseLock();
    } catch {
      // The reader may already have been released by a failed stream operation.
    }
    try {
      socket.close();
    } catch {
      // Closing is best effort after a transport failure.
    }
  }
}
