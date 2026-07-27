/**
 * A tiny, dependency-free MCP server core.
 *
 * It keeps a registry of tools, resources and prompts and turns an incoming
 * JSON-RPC message into a JSON-RPC response (or `null` for notifications).
 * The transport (see `stdio.ts`) is intentionally decoupled so the dispatch
 * logic can be unit-tested without any I/O.
 */
import {
  ErrorCode,
  PROTOCOL_VERSION,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type PromptDefinition,
  type ResourceDefinition,
  type ServerInfo,
  type ToolDefinition,
} from './types.ts';

/** A resource provider that can list resources lazily (inventories change). */
export interface ResourceProvider {
  list: () => ResourceDefinition[] | Promise<ResourceDefinition[]>;
}

export class McpServer {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly prompts = new Map<string, PromptDefinition>();
  private readonly resourceProviders: ResourceProvider[] = [];
  private readonly info: ServerInfo;

  public constructor(info: ServerInfo) {
    this.info = info;
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public registerPrompt(prompt: PromptDefinition): void {
    this.prompts.set(prompt.name, prompt);
  }

  public registerResourceProvider(provider: ResourceProvider): void {
    this.resourceProviders.push(provider);
  }

  private async listResources(): Promise<ResourceDefinition[]> {
    const all: ResourceDefinition[] = [];
    for (const provider of this.resourceProviders) {
      all.push(...(await provider.list()));
    }
    return all;
  }

  /**
   * Handle a single decoded JSON-RPC message. Returns the response to send, or
   * `null` when the message is a notification that requires no reply.
   */
  public async handle(message: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const id = message.id ?? null;
    const isNotification = message.id === undefined;

    try {
      switch (message.method) {
        case 'initialize': {
          return this.ok(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false, subscribe: false },
              prompts: { listChanged: false },
            },
            serverInfo: this.info,
          });
        }

        case 'notifications/initialized':
        case 'notifications/cancelled': {
          return null;
        }

        case 'ping': {
          return this.ok(id, {});
        }

        case 'tools/list': {
          return this.ok(id, {
            tools: [...this.tools.values()].map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          });
        }

        case 'tools/call': {
          return await this.callTool(id, message.params);
        }

        case 'resources/list': {
          return this.ok(id, {
            resources: (await this.listResources()).map((resource) => ({
              uri: resource.uri,
              name: resource.name,
              description: resource.description,
              mimeType: resource.mimeType,
            })),
          });
        }

        case 'resources/read': {
          return await this.readResource(id, message.params);
        }

        case 'prompts/list': {
          return this.ok(id, {
            prompts: [...this.prompts.values()].map((prompt) => ({
              name: prompt.name,
              description: prompt.description,
              arguments: prompt.arguments,
            })),
          });
        }

        case 'prompts/get': {
          return await this.getPrompt(id, message.params);
        }

        default: {
          if (isNotification) {
            return null;
          }
          return this.fail(id, ErrorCode.MethodNotFound, `Unknown method: ${message.method}`);
        }
      }
    } catch (error) {
      if (isNotification) {
        return null;
      }
      return this.fail(id, ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
    }
  }

  private async callTool(
    id: string | number | null,
    parameters: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    const name = typeof parameters?.['name'] === 'string' ? (parameters['name'] as string) : undefined;
    if (!name) {
      return this.fail(id, ErrorCode.InvalidParams, 'tools/call requires a string "name"');
    }
    const tool = this.tools.get(name);
    if (!tool) {
      return this.fail(id, ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    const arguments_ = (parameters?.['arguments'] as Record<string, unknown> | undefined) ?? {};
    try {
      const result = await tool.handler(arguments_);
      return this.ok(id, result);
    } catch (error) {
      // Tool-level failures are reported inside the result, not as protocol errors.
      return this.ok(id, {
        content: [
          { type: 'text', text: `Tool "${name}" failed: ${error instanceof Error ? error.message : String(error)}` },
        ],
        isError: true,
      });
    }
  }

  private async readResource(
    id: string | number | null,
    parameters: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    const uri = typeof parameters?.['uri'] === 'string' ? (parameters['uri'] as string) : undefined;
    if (!uri) {
      return this.fail(id, ErrorCode.InvalidParams, 'resources/read requires a string "uri"');
    }
    const resource = (await this.listResources()).find((candidate) => candidate.uri === uri);
    if (!resource) {
      return this.fail(id, ErrorCode.InvalidParams, `Unknown resource: ${uri}`);
    }
    const text = await resource.read();
    return this.ok(id, {
      contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }],
    });
  }

  private async getPrompt(
    id: string | number | null,
    parameters: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    const name = typeof parameters?.['name'] === 'string' ? (parameters['name'] as string) : undefined;
    if (!name) {
      return this.fail(id, ErrorCode.InvalidParams, 'prompts/get requires a string "name"');
    }
    const prompt = this.prompts.get(name);
    if (!prompt) {
      return this.fail(id, ErrorCode.MethodNotFound, `Unknown prompt: ${name}`);
    }
    const arguments_ = (parameters?.['arguments'] as Record<string, string> | undefined) ?? {};
    const result = await prompt.build(arguments_);
    return this.ok(id, result);
  }

  private ok(id: string | number | null, result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private fail(id: string | number | null, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
