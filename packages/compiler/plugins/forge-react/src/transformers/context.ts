/**
 * The mutable state threaded through the React lowering.
 *
 * Lowering is a single pass over the generic AST that *prints* React source, so
 * a handful of facts are discovered while printing rather than up front: a
 * `<Slot>` with fallback content introduces a `<>…</>` fragment (which the
 * classic-`h` JSX transform compiles to `createElement(Fragment, …)`, so
 * `Fragment` must be imported), a `className={[…]}` array collapses to a
 * `classNames(…)` call (so the neutral helper must be imported), and every
 * static-marked subtree becomes a module-level constant. The emitter builds the
 * import block *after* the body is printed, reading these flags.
 */

/** Lowering state shared by the statement, expression and JSX printers. */
export interface ReactLoweringContext {
  /** The props parameter name a `<Slot name="x" />` reads from (e.g. `properties`). */
  readonly propertiesParameterName: string;
  /** Whether the module declares any slot at all (`intentions.slots`). */
  readonly hasSlots: boolean;
  /** Whether static-marked subtrees are lifted to module-level constants (`react:hoist-static-subtrees`). */
  readonly hoistStatic: boolean;
  /** Whether a `<>…</>` wrapper around a single element is dropped (`react:collapse-fragments`). */
  readonly unwrapSingleChildFragments: boolean;
  /** Module-level `const __mpHoist_N = …;` statements collected from static subtrees. */
  readonly hoisted: string[];
  /** Set while printing inside an already-hoisted subtree, so nested markers do not hoist again. */
  hoisting: boolean;
  /** Set when a `className={[…]}` array collapsed to a `classNames(…)` call. */
  usedClassNames: boolean;
  /** Set when a `<>…</>` fragment was printed. */
  usedFragment: boolean;
}

/** The print-time decisions the lowering plan hands to the printers. */
export interface ReactLoweringOptions {
  readonly propertiesParameterName: string;
  readonly hasSlots?: boolean;
  readonly hoistStatic?: boolean;
  readonly unwrapSingleChildFragments?: boolean;
}

/** Create a fresh lowering context. */
export function createLoweringContext(
  options: ReactLoweringOptions,
): ReactLoweringContext {
  return {
    propertiesParameterName: options.propertiesParameterName,
    hasSlots: options.hasSlots ?? false,
    hoistStatic: options.hoistStatic ?? true,
    unwrapSingleChildFragments: options.unwrapSingleChildFragments ?? false,
    hoisted: [],
    hoisting: false,
    usedClassNames: false,
    usedFragment: false,
  };
}
