/**
 * Newline-delimited JSON-RPC transport over stdio.
 *
 * The MCP stdio transport frames each JSON-RPC message as a single line of
 * UTF-8 JSON terminated by `\n`. This helper wires a running {@link McpServer}
 * to `process.stdin` / `process.stdout`. Diagnostics are written to `stderr`
 * so they never corrupt the protocol stream on `stdout`.
 */
import type { McpServer } from './server.ts';
import type { JsonRpcRequest } from './types.ts';

export function serveStdio(server: McpServer): void {
  let buffer = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        void dispatchLine(server, line);
      }
      newlineIndex = buffer.indexOf('\n');
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });
}

async function dispatchLine(server: McpServer, line: string): Promise<void> {
  let message: JsonRpcRequest;
  try {
    message = JSON.parse(line) as JsonRpcRequest;
  } catch (error) {
    process.stderr.write(
      `[mission-mcp] failed to parse message: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return;
  }

  const response = await server.handle(message);
  if (response !== null) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}
