import { describe, expect, it } from "vitest";

import { moduleImport, semanticModule, statement } from "../ir-test-helpers.js";

import { emitVueHookModule } from "./hook-module.js";

const NEUTRAL_IMPORT = moduleImport(
  "import { useEffect, useState, type MpRef } from '@mission-platform/forge';",
  "@mission-platform/forge",
  { valueNames: ["useEffect", "useState"], typeNames: ["MpRef"] },
);

describe("the Vue hook-module emitter compiles a neutral composable", () => {
  it("translates state, effects and the reactive return", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-counter.ts",
      imports: [NEUTRAL_IMPORT],
      declarations: [
        statement(
          `export function useCounter(initial: number): number {
  const [count, setCount] = useState(initial);
  useEffect(() => { report(count); }, [count]);
  setCount(initial);
  return count;
}`,
          "function",
          { name: "useCounter", exported: true },
        ),
      ],
    });

    const code = emitVueHookModule(module);

    expect(code).toContain("import { ref, type Ref } from 'vue';");
    expect(code).toContain(
      "export function useCounter(initial: number): Ref<number> {",
    );
    expect(code).toContain("const count = ref(initial);");
    expect(code).toContain(
      "watch(() => [count.value], () => { report(count.value); }, { immediate: true });",
    );
    expect(code).toContain("count.value = initial;");
    expect(code).toContain("return count as Ref<number>;");
  });

  it("maps `useMemo` to `computed` and `useRef` to `shallowRef`", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-values.ts",
      declarations: [
        statement(
          `export function useValues(items: readonly string[]) {
  const total = useMemo(() => items.length, [items]);
  const cache = useRef<Map<string, string>>(new Map());
  cache.current.set('a', 'b');
  return total;
}`,
          "function",
          { name: "useValues", exported: true },
        ),
      ],
    });

    const code = emitVueHookModule(module);

    expect(code).toContain("import { shallowRef, computed } from 'vue';");
    expect(code).toContain("const total = computed(() => items.length);");
    expect(code).toContain(
      "const cache = shallowRef<Map<string, string>>(new Map());",
    );
    expect(code).toContain("cache.value.set('a', 'b');");
    // Without a declared return type the composable hands back the computed's
    // current value, exactly as the neutral source did.
    expect(code).toContain("return total.value;");
  });

  it("hands a bundle of reactive values back as getters", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-drawing.ts",
      declarations: [
        statement(
          `export function useDrawing(): UseDrawingReturn {
  const [mode, setMode] = useState('idle');
  const start = () => setMode('drawing');
  return { mode, start };
}`,
          "function",
          { name: "useDrawing", exported: true },
        ),
      ],
    });

    const code = emitVueHookModule(module);

    expect(code).toContain(
      "get mode() { return mode.value as UseDrawingReturn['mode']; }",
    );
    expect(code).toContain("start");
    expect(code).toContain("const start = () => mode.value = 'drawing';");
  });

  it("carries non-function declarations verbatim and flattens relative imports", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "use-shape.ts",
      imports: [
        moduleImport(
          "import { toShape } from '../shapes/convert';",
          "../shapes/convert",
          { valueNames: ["toShape"] },
        ),
      ],
      declarations: [
        statement("export interface Shape {\n  id: string;\n}", "interface", {
          name: "Shape",
          exported: true,
        }),
        statement("export const ORIGIN = { x: 0, y: 0 };", "variable", {
          name: "ORIGIN",
          exported: true,
        }),
      ],
    });

    const code = emitVueHookModule(module);

    expect(code).toContain("import { toShape } from './convert';");
    expect(code).toContain("export interface Shape {");
    expect(code).toContain("export const ORIGIN = { x: 0, y: 0 };");
  });

  it("keeps neutral h imports used by context helper render functions", () => {
    const module = semanticModule({
      moduleKind: "composable",
      fileName: "sprite-provider.ts",
      imports: [
        moduleImport(
          "import { createContext, h, type MpElement, useContext } from '@mission-platform/forge';",
          "@mission-platform/forge",
          {
            valueNames: ["createContext", "h", "useContext"],
            typeNames: ["MpElement"],
          },
        ),
      ],
      declarations: [
        statement(
          "const SpriteContext = createContext<string>('');",
          "variable",
          { name: "SpriteContext" },
        ),
        statement(
          `export function SpriteProvider(): MpElement {
  return h('svg', { href: useContext(SpriteContext) });
}`,
          "function",
          { name: "SpriteProvider", exported: true },
        ),
      ],
    });

    const code = emitVueHookModule(module);

    expect(code).toContain("import { h } from '@mission-platform/forge';");
    expect(code).toContain(
      "import { createContext, useContext } from '@mission-platform/forge/vue';",
    );
    expect(code).toContain(
      "return h('svg', { href: useContext(SpriteContext) });",
    );
  });
});
