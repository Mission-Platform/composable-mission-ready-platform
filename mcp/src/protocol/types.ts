/**
 * Minimal, dependency-free type definitions for the subset of JSON-RPC 2.0 and
 * the Model Context Protocol (MCP) used by this server.
 *
 * The MCP stdio transport exchanges newline-delimited JSON-RPC 2.0 messages.
 * Only the handful of methods this server implements are modelled here.
 */

/** The protocol revision advertised during `initialize`. */
export const PROTOCOL_VERSION = '2025-06-18';

/** A loose JSON Schema description used for tool input definitions. */
export type JsonSchema = Record<string, unknown>;

/** JSON-RPC request or notification (a notification omits `id`). */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorBody {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcErrorBody;
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcErrorResponse;

/** Standard JSON-RPC error codes plus MCP conventions. */
export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

/** A single block of tool / prompt content. Only text is used here. */
export interface TextContent {
  type: 'text';
  text: string;
}

/** Result returned by a tool handler. */
export interface ToolResult {
  content: TextContent[];
  isError?: boolean;
}

/** A tool the client may invoke via `tools/call`. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;
}

/** Contents returned by `resources/read`. */
export interface ResourceContents {
  uri: string;
  mimeType: string;
  text: string;
}

/** A resource exposed via `resources/list` and read via `resources/read`. */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read: () => string | Promise<string>;
}

/** A single argument accepted by a prompt. */
export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: TextContent;
}

export interface PromptResult {
  description?: string;
  messages: PromptMessage[];
}

/** A reusable prompt exposed via `prompts/list` and built via `prompts/get`. */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
  build: (args: Record<string, string>) => PromptResult | Promise<PromptResult>;
}

/** Metadata reported to the client during `initialize`. */
export interface ServerInfo {
  name: string;
  version: string;
}
