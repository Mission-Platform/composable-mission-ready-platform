import { describe, expect, it } from "vitest";

import { moduleImport, semanticModule, statement } from "../ir-test-helpers.ts";

import { emitWebComponentHookModule } from "./hook-module.ts";

describe("the Web-Components hook-module emitter", () => {
  it("keeps the neutral runtime primitives and redirects the local JSX types", () => {
    const code = emitWebComponentHookModule(
      semanticModule({
        moduleKind: "composable",
        imports: [
          moduleImport(
            "import { createContext, hasSlot, useContext, type MpRenderProperty, type ClassValue } from '@mission-platform/forge-jsx';",
            "@mission-platform/forge-jsx",
            {
              valueNames: ["createContext", "hasSlot", "useContext"],
              typeNames: ["MpRenderProperty", "ClassValue"],
            },
          ),
        ],
        declarations: [
          statement(
            "export const MapContext = createContext<number>(0);",
            "variable",
            {
              name: "MapContext",
              exported: true,
            },
          ),
        ],
      }),
    );

    expect(code).toContain(
      "import { createContext, useContext } from '@mission-platform/forge-jsx';",
    );
    expect(code).toContain(
      "import type { MpRenderProperty } from './mp-jsx-types';",
    );
    expect(code).toContain(
      "import type { ClassValue } from '@mission-platform/forge-jsx';",
    );
    expect(code).not.toContain("hasSlot");
    expect(code).toContain(
      "export const MapContext = createContext<number>(0);",
    );
  });

  it("flattens a relative sibling import while preserving its clause", () => {
    const code = emitWebComponentHookModule(
      semanticModule({
        moduleKind: "composable",
        imports: [
          moduleImport(
            "import { MapContext as Ctx } from '../components/map-context';",
            "../components/map-context",
            {
              valueNames: ["Ctx"],
            },
          ),
        ],
      }),
    );

    expect(code).toContain(
      "import { MapContext as Ctx } from './map-context';",
    );
  });

  it("keeps a bare package import verbatim", () => {
    const code = emitWebComponentHookModule(
      semanticModule({
        moduleKind: "composable",
        imports: [
          moduleImport("import { z } from 'zod'", "zod", { valueNames: ["z"] }),
        ],
      }),
    );

    expect(code).toContain("import { z } from 'zod';");
  });
});
