---
name: typescript-advanced-types
description: Master Mission Platform TypeScript strict typing standards, explicit interfaces over implicit types, satisfies over type assertions (as), constrained generics, and eradication of any and unvalidated unknown. Use when authoring TypeScript models, composables, utility types, generic functions, and API contracts.
---

# TypeScript Advanced Types & Strict Typing Standards

Comprehensive standards and patterns for the Mission Platform TypeScript type system. These guidelines ensure compile-time correctness, eliminate type-system bypasses, and maximize type inference across applications and packages.

---

## The Five Core Directives

### 1. Absolute Prohibition of `any`

- **Rule**: The `any` keyword is unconditionally banned across all source code, tests, composables, and type definitions.
- **Why**: `any` disables TypeScript's type checker, propagates silently across call chains, hides broken contracts, and prevents auto-refactoring.
- **Resolution**:
  - For polymorphic collections: use bounded generics (`<T extends BaseItem>`).
  - For variable message shapes: use discriminated unions with an explicit `type` or `kind` tag.
  - For untyped external inputs: use `unknown` accompanied by immediate runtime parsing.

```typescript
// ❌ PROHIBITED
function processData(payload: any): any {
  return payload.data;
}

// ✅ MANDATED: Discriminated union or concrete interface
interface ApiResponse<TData extends Record<string, unknown>> {
  readonly status: "success";
  readonly data: TData;
}

interface ApiError {
  readonly status: "error";
  readonly message: string;
}

type NetworkResult<TData extends Record<string, unknown>> =
  ApiResponse<TData> | ApiError;

function processResult<TData extends Record<string, unknown>>(
  result: NetworkResult<TData>,
): TData | undefined {
  if (result.status === "success") {
    return result.data;
  }
  return undefined;
}
```

---

### 2. Strict Boundaries on `unknown`

- **Rule**: `unknown` must never propagate across internal interfaces, domain models, or exported function return types.
- **Boundary Validation**: When untrusted or unvalidated data arrives from outside the process (HTTP requests, URL params, local storage, tool arguments), it enters as `unknown` and **must be validated immediately** via Zod schemas or type guards before passing to domain functions.

```typescript
import { z } from "zod";

// ❌ PROHIBITED: Leaking unknown into domain logic
export function handleUserData(input: unknown): string {
  // @ts-expect-error input is unknown
  return input.name;
}

// ✅ MANDATED: Immediate boundary validation with Zod
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export function parseAndHandleUser(rawInput: unknown): UserProfile {
  const user = UserProfileSchema.parse(rawInput);
  return user; // Concrete, fully-typed UserProfile
}
```

---

### 3. Explicit Types & Interfaces over Implicit Types

- **Rule**: Provide explicit type annotations on all exported function signatures, composables, API handlers, and component props.
- **`interface` vs `type`**:
  - Use `interface` for: object shapes, component props, state contracts, and extensible domain models.
  - Use `type` for: union types, intersection types, tuples, template literals, and utility transformations.

```typescript
// ✅ Explicit interface for domain object
export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: string;
}

// ✅ Explicit type for union / template literal
export type NavigationTheme = "light" | "dark" | "contrast";
export type ElementRoute = `/${string}`;

// ✅ Explicit signature annotation on composable
export function useNavigation(theme: NavigationTheme): {
  readonly items: readonly NavigationItem[];
  readonly activeId: string | undefined;
  readonly setActive: (id: string) => void;
} {
  // implementation
}
```

---

### 4. Mandate `satisfies` for Declaration Contracts; Limit `as` to Validated Narrowing

- **Rule**:
  - **Declaration-Site Validation**: Always use `value satisfies Type` instead of `value as Type` when declaring constants, configuration objects, maps, or records. Never use `as Type` to satisfy a contract at declaration site.
  - **Use-Site Narrowing**: Narrow `as` assertions (`value as NarrowType`) are permitted **only at use sites after runtime validation** (e.g. Zod schema validation, explicit type guards, or external boundary parsing) has already proven that the value conforms to the asserted shape. Unnecessary, unvalidated, or widening assertions (`as any`, `as unknown`, unchecked casts) remain strictly prohibited.
- **Why**:
  - `as Type` at declaration site blinds the compiler. If a property is missing, extra, or misspelled, `as` silences the error and allows runtime crashes.
  - `satisfies Type` at declaration site validates that the expression matches the contract **without widening the type**, preserving exact literal types, exact keys, and full autocompletion.
  - Distinguishing use-site narrowing (backed by runtime validation evidence) from declaration-site validation ensures compile-time contracts are verified without sacrificing type safety when interacting with untyped DOM APIs or external boundaries.

```typescript
interface RouteConfig {
  readonly path: string;
  readonly access: "public" | "authenticated" | "admin";
}

// ❌ DANGEROUS: 'as' masks missing or misspelled properties
const badRoutes = {
  home: { path: "/", access: "public" },
  dashboard: { path: "/dashboard" }, // Missing access! 'as' allows this bug:
} as Record<string, RouteConfig>;

// ✅ MANDATED: 'satisfies' enforces contract AND preserves exact keys
const routes = {
  home: { path: "/", access: "public" },
  dashboard: { path: "/dashboard", access: "authenticated" },
} satisfies Record<string, RouteConfig>;

// Exact keys preserved:
routes.home.path; // string
routes.dashboard.path; // string
// routes.unknown;     // TypeScript Error: Property 'unknown' does not exist!
```

#### Exhaustive Union Checking via `satisfies never`

```typescript
type NotificationType = "email" | "sms" | "push";

function formatNotification(type: NotificationType): string {
  switch (type) {
    case "email":
      return "Sending Email";
    case "sms":
      return "Sending SMS";
    case "push":
      return "Sending Push Notification";
    default:
      // Compile error if any union member is unhandled:
      return type satisfies never;
  }
}
```

---

### 5. Constrained Generics and Call-Site Inference

- **Rule**: Unconstrained open generics (`<T>`) are prohibited. Every generic type parameter must declare a meaningful upper bound: `<T extends ExpectedContract>`.
- **Forbid Open Record Bounds**: Never write `<T extends Record<string, any>>`. Use concrete value types: `<T extends Record<string, string>>` or `<T extends Record<string, unknown>>`.
- **Call-Site Inference**: Structure function parameters so that TypeScript naturally infers type arguments from the provided arguments without requiring callers to specify generic parameters manually.
- **`const` Type Parameters**: Use `const` type parameters (`<const T extends readonly string[]>`) to infer literal array and object shapes at call sites without requiring `as const`.

```typescript
// ❌ PROHIBITED: Open unconstrained generic
function getProperty<T>(obj: T, key: string) {
  // @ts-expect-error no guarantee key exists on T
  return obj[key];
}

// ✅ MANDATED: Bounded constraint and inferred key
function getProperty<
  TEntity extends Record<PropertyKey, unknown>,
  TKey extends keyof TEntity,
>(entity: TEntity, key: TKey): TEntity[TKey] {
  return entity[key];
}

// ✅ Call-site inference: callers never manually pass <Entity, Key>
const user = { id: "usr-1", name: "Alice", active: true };
const userName = getProperty(user, "name"); // Type: string (inferred)
const isActive = getProperty(user, "active"); // Type: boolean (inferred)

// ✅ const type parameters for literal inference
function defineTuple<const TItems extends readonly string[]>(
  items: TItems,
): TItems {
  return items;
}

const statusList = defineTuple(["draft", "pending", "published"]);
// Type: readonly ['draft', 'pending', 'published'] (not string[])
```

---

## Advanced Type Utility Patterns

### Constrained Conditional Types

```typescript
export interface Identifiable {
  readonly id: string;
}

// Type parameter bounded to Identifiable
export type EntityId<TEntity extends Identifiable> = TEntity["id"];

// Constrained infer
export type UnpackPromise<TPromise extends Promise<unknown>> =
  TPromise extends Promise<infer TResult extends Record<string, unknown>>
    ? TResult
    : never;
```

### Strongly Typed Event Emitter Contract

```typescript
export type EventPayloadMap = Record<
  string,
  Record<string, unknown> | undefined
>;

export interface TypedEmitter<TEvents extends EventPayloadMap> {
  on<TEventName extends keyof TEvents>(
    event: TEventName,
    handler: (payload: TEvents[TEventName]) => void,
  ): void;
  emit<TEventName extends keyof TEvents>(
    event: TEventName,
    payload: TEvents[TEventName],
  ): void;
}
```

---

## Detailed Reference

For complete worked examples without `any`, `unknown` leakage, or unsafe type casts, see:
[Worked Examples & Patterns](references/details.md)
