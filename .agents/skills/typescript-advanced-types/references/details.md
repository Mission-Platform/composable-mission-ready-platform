# TypeScript Advanced Types — Detailed Worked Examples

This reference documents production-grade TypeScript patterns adhering strictly to Mission Platform typing standards:

- **Zero occurrences of `any`**
- **Strictly bounded `unknown` with validation**
- **`satisfies` over `as` assertions**
- **Constrained generics with natural call-site inference**

---

## Pattern 1: Type-Safe Event Emitter

This event emitter strictly avoids `any` and `Record<string, any>`. Event payloads are constrained to object structures or `void`.

```typescript
export interface UserCreatedPayload {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface UserDeletedPayload {
  readonly id: string;
  readonly reason?: string;
}

export interface AppEventMap {
  readonly "user:created": UserCreatedPayload;
  readonly "user:deleted": UserDeletedPayload;
  readonly "app:reset": Record<string, never>;
}

export class StrictEventEmitter<
  TEvents extends { [K in keyof TEvents]: object | void },
> {
  private readonly listeners: {
    [K in keyof TEvents]?: Array<(payload: TEvents[K]) => void>;
  } = {};

  public on<TEventKey extends keyof TEvents>(
    event: TEventKey,
    callback: (payload: TEvents[TEventKey]) => void,
  ): () => void {
    const list = this.listeners[event] ?? [];
    list.push(callback);
    this.listeners[event] = list;

    // Return unbind handler
    return () => {
      const current = this.listeners[event];
      if (current) {
        this.listeners[event] = current.filter((fn) => fn !== callback);
      }
    };
  }

  public emit<TEventKey extends keyof TEvents>(
    event: TEvents[TEventKey] extends void ? TEventKey : never,
  ): void;
  public emit<TEventKey extends keyof TEvents>(
    event: TEventKey,
    payload: TEvents[TEventKey],
  ): void;
  public emit<TEventKey extends keyof TEvents>(
    event: TEventKey,
    payload?: TEvents[TEventKey],
  ): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      for (const callback of callbacks) {
        callback(payload as TEvents[TEventKey]);
      }
    }
  }
}

// Usage Example
const emitter = new StrictEventEmitter<AppEventMap>();

emitter.on("user:created", (user) => {
  console.log(user.id, user.name, user.email);
});

// Full compile-time validation:
emitter.emit("user:created", {
  id: "usr-123",
  name: "Taylor",
  email: "taylor@example.com",
});
```

---

## Pattern 2: Strongly Typed API Client with `satisfies`

Endpoints define strict schemas for query params, request bodies, and responses. The client infers exact types without type assertions.

```typescript
export interface UserResource {
  readonly id: string;
  readonly name: string;
  readonly role: "admin" | "member";
}

export interface CreateUserDto {
  readonly name: string;
  readonly role: "admin" | "member";
}

export interface EndpointDefinition<TParams, TBody, TResponse> {
  readonly params?: TParams;
  readonly body?: TBody;
  readonly response: TResponse;
  readonly parseResponse?: (data: unknown) => TResponse;
}

export interface ApiEndpoints {
  readonly "/api/users": {
    readonly GET: EndpointDefinition<
      Record<string, never>,
      undefined,
      readonly UserResource[]
    >;
    readonly POST: EndpointDefinition<
      Record<string, never>,
      CreateUserDto,
      UserResource
    >;
  };
  readonly "/api/users/:id": {
    readonly GET: EndpointDefinition<
      { readonly id: string; readonly format?: string },
      undefined,
      UserResource
    >;
    readonly DELETE: EndpointDefinition<
      { readonly id: string },
      undefined,
      { readonly success: boolean }
    >;
  };
}

export class TypedApiClient<
  TRoutes extends {
    [K in keyof TRoutes]: {
      [M in keyof TRoutes[K]]: EndpointDefinition<unknown, unknown, unknown>;
    };
  },
> {
  private readonly baseUrl: string;
  private readonly routes?: TRoutes;

  public constructor(baseUrl: string, routes?: TRoutes) {
    this.baseUrl = baseUrl;
    this.routes = routes;
  }

  public async request<
    TRoute extends keyof TRoutes,
    TMethod extends keyof TRoutes[TRoute],
  >(
    route: TRoute,
    method: TMethod,
    options: {
      readonly params?: TRoutes[TRoute][TMethod]["params"];
      readonly body?: TRoutes[TRoute][TMethod]["body"];
      readonly parseResponse?: (data: unknown) => TRoutes[TRoute][TMethod]["response"];
    },
  ): Promise<TRoutes[TRoute][TMethod]["response"]> {
    let routePath = String(route);
    const queryEntries: Array<[string, string]> = [];

    if (options.params && typeof options.params === "object") {
      const paramsRecord = options.params as Record<string, unknown>;
      for (const [key, value] of Object.entries(paramsRecord)) {
        if (value !== undefined) {
          const placeholder = `:${key}`;
          if (routePath.includes(placeholder)) {
            routePath = routePath.replaceAll(
              placeholder,
              encodeURIComponent(String(value)),
            );
          } else {
            queryEntries.push([key, String(value)]);
          }
        }
      }
    }

    const unresolvedMatch = /:[a-zA-Z0-9_]+/.exec(routePath);
    if (unresolvedMatch) {
      throw new Error(
        `Unresolved route parameter "${unresolvedMatch[0]}" in path: ${routePath}`,
      );
    }

    const url = new URL(routePath, this.baseUrl);
    for (const [key, value] of queryEntries) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString(), {
      method: String(method),
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const rawData: unknown = await response.json();
    const validate =
      options.parseResponse ?? this.routes?.[route]?.[method]?.parseResponse;
    if (validate) {
      return validate(rawData);
    }
    throw new Error(
      `Response validation failed: no configured parser or schema provided for ${String(method)} ${String(route)}.`,
    );
  }
}

// Runtime validator functions for boundary data
export function isUserResource(data: unknown): data is UserResource {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).id === "string" &&
    typeof (data as Record<string, unknown>).name === "string" &&
    ((data as Record<string, unknown>).role === "admin" ||
      (data as Record<string, unknown>).role === "member")
  );
}

export function parseUserList(data: unknown): readonly UserResource[] {
  if (Array.isArray(data) && data.every(isUserResource)) {
    return data;
  }
  throw new Error("Invalid UserResource list response payload.");
}

export function parseUserResource(data: unknown): UserResource {
  if (isUserResource(data)) {
    return data;
  }
  throw new Error("Invalid UserResource response payload.");
}

// Client instantiation verified with satisfies
export const clientConfig = {
  timeoutMs: 5000,
  retries: 3,
} satisfies { readonly timeoutMs: number; readonly retries: number };

export const api = new TypedApiClient<ApiEndpoints>(
  "https://api.mission-platform.local",
);

// Call site with parameter replacement and schema parser validation:
const user = await api.request("/api/users/:id", "GET", {
  params: { id: "user_42" },
  parseResponse: parseUserResource,
});
console.log(user.id, user.name, user.role);
```

---

## Pattern 3: Type-Safe Builder Pattern with Narrow State Transitions

A builder pattern where the compile-time state tracks which fields have been set, ensuring that `.build()` cannot be called until all required fields are populated — without runtime `any`.

```typescript
export interface ServiceConfig {
  readonly serviceName: string;
  readonly port: number;
  readonly host: string;
  readonly secure: boolean;
}

// State tracking interface
interface BuilderState {
  readonly hasName: boolean;
  readonly hasPort: boolean;
  readonly hasHost: boolean;
}

export class ServiceConfigBuilder<TState extends BuilderState> {
  private readonly config: Partial<ServiceConfig>;

  private constructor(config: Partial<ServiceConfig>) {
    this.config = config;
  }

  public static create(): ServiceConfigBuilder<{
    readonly hasName: false;
    readonly hasPort: false;
    readonly hasHost: false;
  }> {
    return new ServiceConfigBuilder({ secure: true });
  }

  public setServiceName(
    name: string,
  ): ServiceConfigBuilder<
    Omit<TState, "hasName"> & { readonly hasName: true }
  > {
    return new ServiceConfigBuilder({ ...this.config, serviceName: name });
  }

  public setPort(
    port: number,
  ): ServiceConfigBuilder<
    Omit<TState, "hasPort"> & { readonly hasPort: true }
  > {
    return new ServiceConfigBuilder({ ...this.config, port });
  }

  public setHost(
    host: string,
  ): ServiceConfigBuilder<
    Omit<TState, "hasHost"> & { readonly hasHost: true }
  > {
    return new ServiceConfigBuilder({ ...this.config, host });
  }

  public setSecure(secure: boolean): ServiceConfigBuilder<TState> {
    return new ServiceConfigBuilder({ ...this.config, secure });
  }

  // build() is ONLY callable when hasName, hasPort, and hasHost are true!
  public build(
    this: ServiceConfigBuilder<{
      readonly hasName: true;
      readonly hasPort: true;
      readonly hasHost: true;
    }>,
  ): ServiceConfig {
    return {
      serviceName: this.config.serviceName ?? "default-service",
      port: this.config.port ?? 8080,
      host: this.config.host ?? "localhost",
      secure: this.config.secure ?? true,
    } satisfies ServiceConfig;
  }
}

// Valid invocation:
const service = ServiceConfigBuilder.create()
  .setServiceName("identity-worker")
  .setPort(443)
  .setHost("identity.internal")
  .build(); // OK!

// Calling .build() prematurely causes a clear compile-time error:
// ServiceConfigBuilder.create().setServiceName('only-name').build();
// ❌ Error: The 'this' context of type ... is not assignable to method's 'this' of type ...
```

---

## Pattern 4: Discriminated Unions with Exhaustive `satisfies never`

Discriminated unions ensure type safety when processing state machines or event workflows. Adding a new union member produces an immediate compile error at unhandled match sites.

```typescript
export interface LoadingState {
  readonly status: "loading";
}

export interface SuccessState<TData extends Record<string, unknown>> {
  readonly status: "success";
  readonly data: TData;
  readonly timestamp: number;
}

export interface ErrorState {
  readonly status: "error";
  readonly error: Error;
}

export type ViewState<TData extends Record<string, unknown>> =
  LoadingState | SuccessState<TData> | ErrorState;

export function renderViewState<TData extends Record<string, unknown>>(
  state: ViewState<TData>,
): string {
  switch (state.status) {
    case "loading":
      return "Loading content...";
    case "success":
      return `Loaded successfully with ${Object.keys(state.data).length} items.`;
    case "error":
      return `Error occurred: ${state.error.message}`;
    default:
      // If a new status ('idle') is added to ViewState, TypeScript produces an error here:
      return state satisfies never;
  }
}
```

---

## Pattern 5: Generic Table Component Props with Row Inferences

Demonstrates generic prop inference for UI components without `any`.

```typescript
export interface TableColumn<TRow extends Record<string, unknown>> {
  readonly key: keyof TRow;
  readonly header: string;
  readonly render?: (value: TRow[keyof TRow], row: TRow) => string;
}

export interface TableProps<TRow extends Record<string, unknown>> {
  readonly data: readonly TRow[];
  readonly columns: readonly TableColumn<TRow>[];
  readonly keyField: keyof TRow;
}

export function defineTable<TRow extends Record<string, unknown>>(
  props: TableProps<TRow>,
): TableProps<TRow> {
  return props;
}

interface UserRow extends Record<string, unknown> {
  readonly id: string;
  readonly username: string;
  readonly age: number;
}

// Inferred without manual generic parameter:
export const userTable = defineTable({
  data: [
    { id: "1", username: "alex", age: 32 },
    { id: "2", username: "sam", age: 28 },
  ] as const satisfies readonly UserRow[],
  columns: [
    { key: "username", header: "User Name" },
    { key: "age", header: "Age", render: (val) => `${val} yrs` },
  ],
  keyField: "id",
});
```
