/**
 * Framework-neutral **context** (provide/inject) primitive for the
 * `@mission-platform/forge` dialect.
 *
 * A write-once component shares a value with an arbitrarily deep subtree —
 * without threading it through every intermediate component's props — by
 * creating a context once and reading it where needed, exactly like React's
 * `createContext`/`useContext` and Vue's `provide`/`inject`:
 *
 * ```tsx
 * const ThemeContext = createContext<Theme>('light');
 *
 * export function BaseThemeProvider(properties: Properties): MpElement {
 *   return <ThemeContext.Provider value={properties.theme}><Slot /></ThemeContext.Provider>;
 * }
 *
 * export function BaseThemedButton(properties: Properties): MpElement {
 *   const theme = useContext(ThemeContext);
 *   return <button class={`btn btn--${theme}`}><Slot /></button>;
 * }
 * ```
 *
 * `@mission-platform/vite-plugin-forge` maps the primitives to each framework's
 * native mechanism at build time:
 *
 * - **React** — `createContext`/`useContext` *are* React's own, so their import
 *   is rewritten to `react` and a `<Ctx.Provider value={…}>` compiles to a
 *   native React context provider with no neutral runtime.
 * - **Vue** — their import is rewritten to `@mission-platform/forge/vue`, whose
 *   `createContext` returns a `Provider` component backed by `provide()` and
 *   whose `useContext` is `inject()`, so the same source compiles to native Vue
 *   provide/inject.
 *
 * The implementation **here** is the baseline used by the runtime adapters
 * (`@mission-platform/forge/react`, `.../vue`) and SSR: a `createContext` carries a
 * small synchronous provide stack, the adapters push a `<Ctx.Provider>`'s value
 * while expanding its subtree (and pop afterwards), and `useContext` reads the
 * top of that stack — so a neutral component tree resolves context identically
 * on both adapters, keeping the cross-framework SSR parity intact.
 */
import { type MpChild, type MpComponent, type MpProperties } from './types';

/**
 * The property the runtime adapters use to recognise a context {@link MpContext.Provider}
 * function (and recover the context it provides) while walking a neutral tree.
 */
export const MP_CONTEXT: unique symbol = Symbol.for('@mission-platform/forge.context');

/** The properties accepted by an {@link MpContext.Provider} element. */
export interface MpContextProviderProperties<T> extends MpProperties {
  /** The value provided to the subtree's {@link useContext} reads. */
  value: T;
  /** The subtree the provided value is visible to. */
  children?: MpChild | readonly MpChild[];
}

/** A context Provider function, tagged with the context it provides. */
export interface MpContextProvider<T> extends MpComponent<MpContextProviderProperties<T>> {
  readonly [MP_CONTEXT]: MpContext<T>;
}

/** A framework-neutral context handle returned by {@link createContext}. */
export interface MpContext<T> {
  /** The provider element (`<Ctx.Provider value={…}>…</Ctx.Provider>`). */
  readonly Provider: MpContextProvider<T>;
  /** The value {@link useContext} returns when no Provider is above the reader. */
  readonly defaultValue: T;
  /** @internal The synchronous provide stack used by the runtime-adapter baseline. */
  readonly stack: T[];
}

/**
 * Create a framework-neutral context with the given default value. Returns a
 * handle carrying a `Provider` element and the default; read the current value
 * with {@link useContext}.
 */
export function createContext<T>(defaultValue: T): MpContext<T> {
  const stack: T[] = [];
  const Provider = (() => {
    throw new Error(
      '@mission-platform/forge: a context <Provider> is a compile-time / adapter marker and must not be rendered directly.',
    );
  }) as unknown as { -readonly [K in keyof MpContextProvider<T>]: MpContextProvider<T>[K] };
  const context: MpContext<T> = { Provider: Provider as MpContextProvider<T>, defaultValue, stack };
  Provider[MP_CONTEXT] = context;
  return context;
}

/** Whether a value is a context {@link MpContext.Provider} function. */
export function isContextProvider(value: unknown): value is MpContextProvider<unknown> {
  return typeof value === 'function' && MP_CONTEXT in value;
}

/**
 * Read the current value of a context: the nearest enclosing
 * `<Ctx.Provider>`'s `value`, or the context's default when there is none.
 */
export function useContext<T>(context: MpContext<T>): T {
  return context.stack.length > 0 ? (context.stack.at(-1) as T) : context.defaultValue;
}
