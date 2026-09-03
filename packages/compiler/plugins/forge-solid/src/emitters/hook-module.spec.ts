import { describe, expect, it } from "vitest";

import { moduleImport, semanticModule, statement } from "../ir-test-helpers.js";

import { emitSolidHookModule } from "./hook-module.js";

import type { SemanticModuleParts } from "../ir-test-helpers.js";

/** Emit a composable fixture. */
function emit(
  parts: Omit<SemanticModuleParts, "moduleKind" | "component">,
): string {
  return emitSolidHookModule(
    semanticModule({ ...parts, moduleKind: "composable" }),
  );
}

describe("emitSolidHookModule", () => {
  it("lowers the reactive primitives of a composable", () => {
    const code = emit({
      imports: [
        moduleImport(
          "import { useState, useEffect } from '@mission-platform/forge';",
          "@mission-platform/forge",
          {
            valueNames: ["useState", "useEffect"],
          },
        ),
      ],
      declarations: [
        statement(
          "export function useCounter() {\n  const [count, setCount] = useState(0);\n  useEffect(() => { log(count); }, [count]);\n  return { count, setCount };\n}",
          "function",
          { name: "useCounter", exported: true },
        ),
      ],
    });

    expect(code).toContain("const [count, setCount] = createSignal(0);");
    expect(code).toContain("createEffect(() => { log(count()); });");
    // Object shorthand carries the value, not the accessor.
    expect(code).toContain("return { count: count(), setCount };");
    expect(code).toContain(
      'import { createSignal, createEffect } from "solid-js";',
    );
  });

  it("does not inject dependencies that the effect callback does not read", () => {
    const code = emit({
      declarations: [
        statement(
          "export function useWatcher() {\n  useEffect(() => { report(); }, [count]);\n}",
          "function",
          { name: "useWatcher", exported: true },
        ),
      ],
    });

    expect(code).toContain("createEffect(() => { report(); });");
    expect(code).not.toContain("count; report();");
  });

  it("registers effect cleanup with Solid teardown", () => {
    const code = emit({
      declarations: [
        statement(
          "export function useSubscription() {\n  useEffect(() => { subscribe(); return () => unsubscribe(); }, []);\n}",
          "function",
          { name: "useSubscription", exported: true },
        ),
      ],
    });

    expect(code).toContain(
      "onMount(() => { subscribe(); onCleanup(() => unsubscribe()); });",
    );
    expect(code).toContain('import { onMount, onCleanup } from "solid-js";');
  });

  it("remaps the neutral context primitives to Solid own exports", () => {
    const code = emit({
      imports: [
        moduleImport(
          "import { createContext, useContext } from '@mission-platform/forge';",
          "@mission-platform/forge",
          { valueNames: ["createContext", "useContext"] },
        ),
      ],
      declarations: [
        statement(
          "export const MapContext = createContext<MapApi | undefined>(undefined);",
          "variable",
        ),
      ],
    });

    expect(code).toContain(
      'import { createContext, useContext } from "solid-js";',
    );
    expect(code).toContain(
      "export const MapContext = createContext<MapApi | undefined>(undefined);",
    );
  });

  it("flattens a relative sibling import and keeps a workspace package verbatim", () => {
    const code = emit({
      imports: [
        moduleImport(
          "import { MapContext } from '../components/map-context';",
          "../components/map-context",
          {
            valueNames: ["MapContext"],
          },
        ),
        moduleImport(
          "import { Icon } from '@mission-platform/icons';",
          "@mission-platform/icons",
          {
            valueNames: ["Icon"],
          },
        ),
      ],
      declarations: [statement("export const icon = Icon;", "variable")],
    });

    expect(code).toContain('import { MapContext } from "./map-context";');
    expect(code).toContain("import { Icon } from '@mission-platform/icons';");
  });

  it("lowers useMemo and useId without touching a type declaration", () => {
    const code = emit({
      declarations: [
        statement(
          "export interface CounterApi {\n  count: number;\n}",
          "interface",
          { name: "CounterApi" },
        ),
        statement("const count = useMemo(() => total * 2, [total]);"),
        statement("const id = useId();"),
      ],
    });

    expect(code).toContain(
      "export interface CounterApi {\n  count: number;\n}",
    );
    expect(code).toContain("const count = createMemo(() => total * 2);");
    expect(code).toContain("const id = createUniqueId();");
  });
});
