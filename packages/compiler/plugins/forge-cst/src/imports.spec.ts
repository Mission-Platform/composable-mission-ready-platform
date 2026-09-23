import { describe, expect, it } from "vitest";

import { parseCst } from "./cst.js";
import { rewriteImportsWithCst } from "./imports.js";

describe("rewriteImportsWithCst", () => {
  it("preserves multiline formatting and inline comments in imports", () => {
    const source = `import {
  MpLink, // Navigation link
  useMpRoute,
  /* query router */ useMpRouter,
} from '@mission-platform/router';

export function Nav() {
  return <MpLink to="/" />;
}
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-redwood",
      preserveNamedSpecifiers: true,
      sourceFileName: "nav.tsx",
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toContain("@mission-platform/forge-router-redwood");
    expect(result.code).not.toContain("@mission-platform/router");
    expect(result.code).toContain("// Navigation link");
    expect(result.code).toContain("/* query router */ useMpRouter");
    expect(result.code).toBe(`import {
  MpLink, // Navigation link
  useMpRoute,
  /* query router */ useMpRouter,
} from '@mission-platform/forge-router-redwood';

export function Nav() {
  return <MpLink to="/" />;
}
`);
    expect(result.map).toBeDefined();
    expect(result.map?.sources).toContain("nav.tsx");
  });

  it("rewrites multiple imports of the target module in a single file", () => {
    const source = `import type { RouteLocation } from '@mission-platform/router';
import { MpLink } from '@mission-platform/router';

export function Component(props: { route: RouteLocation }) {
  return <MpLink to={props.route.path} />;
}
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "vue-router",
      preserveNamedSpecifiers: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(`import type { RouteLocation } from 'vue-router';
import { MpLink } from 'vue-router';

export function Component(props: { route: RouteLocation }) {
  return <MpLink to={props.route.path} />;
}
`);
  });

  it("preserves type-only declarations and inline type specifiers", () => {
    const source = `import { type RouteLocation, MpLink } from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-vue",
      preserveNamedSpecifiers: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code)
      .toBe(`import { type RouteLocation, MpLink } from '@mission-platform/forge-router-vue';
`);
  });

  it("rewrites namespace and default imports accurately", () => {
    const source = `import * as RouterNs from '@mission-platform/router';
import RouterDef from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "react-router-dom",
      preserveNamedSpecifiers: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(`import * as RouterNs from 'react-router-dom';
import RouterDef from 'react-router-dom';
`);
  });

  it("preserves imported specifier renames with 'as'", () => {
    const source = `import { MpLink as CustomLink } from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@tanstack/react-router",
      preserveNamedSpecifiers: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code)
      .toBe(`import { MpLink as CustomLink } from '@tanstack/react-router';
`);
  });

  it("removes target imports when replacementModule is omitted or undefined", () => {
    const source = `import { MpLink } from '@mission-platform/router';
import { useState } from 'react';

export function Component() {
  useState();
  return null;
}
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(`import { useState } from 'react';

export function Component() {
  useState();
  return null;
}
`);
  });

  it("removes unreferenced specifiers when removeUnused is true", () => {
    const source = `import { MpLink, useMpRoute, unusedHelper } from '@mission-platform/router';

export function Page() {
  const route = useMpRoute();
  return <MpLink to={route.path} />;
}
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-vue",
      removeUnused: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toContain(
      "import { MpLink, useMpRoute } from '@mission-platform/forge-router-vue';",
    );
    expect(result.code).not.toContain("unusedHelper");
  });

  it("removes entire import statement if all specifiers are unused with removeUnused", () => {
    const source = `import { unusedOne, unusedTwo } from '@mission-platform/router';
export const value = 42;
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-vue",
      removeUnused: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code.trim()).toBe("export const value = 42;");
  });

  it("maps and filters specifiers using the specifiers option", () => {
    const source = `import { MpLink, useMpRouter } from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "vue-router",
      specifiers: [
        { importedName: "RouterLink", localName: "MpLink" },
        { importedName: "useRouter", localName: "useMpRouter" },
      ],
    });

    expect(result.transformed).toBe(true);
    expect(result.code)
      .toBe(`import { RouterLink as MpLink, useRouter as useMpRouter } from 'vue-router';
`);
  });

  it("returns unmodified source and transformed=false when no target imports exist (zero allocations)", () => {
    const source = `import { useState } from 'react';
export const value = 1;
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-redwood",
    });

    expect(result.transformed).toBe(false);
    expect(result.code).toBe(source);
    expect(result.map).toBeUndefined();
  });

  it("does not rewrite comments or string literals mentioning the target module", () => {
    const source = `// import { MpLink } from '@mission-platform/router';
/* Notice: do not use @mission-platform/router here */
export const routerPackage = "@mission-platform/router";
export const warning = 'Install @mission-platform/router for full features';
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-redwood",
    });

    expect(result.transformed).toBe(false);
    expect(result.code).toBe(source);
  });

  it("splits a single import across multiple replacement modules with per-symbol renames", () => {
    const source = `import { MpLink, useMpRoute, useMpRouter } from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      rewrites: [
        {
          targetModule: "@mission-platform/router",
          replacementModule: "react-router-dom",
          specifiers: [{ sourceName: "MpLink", importedName: "Link" }],
        },
        {
          targetModule: "@mission-platform/router",
          replacementModule: "wouter",
          specifiers: [{ sourceName: "useMpRoute", importedName: "useRoute" }],
        },
        {
          targetModule: "@mission-platform/router",
          replacementModule: "@fixture/router-runtime",
          specifiers: [
            { sourceName: "useMpRouter", importedName: "useMpRouter" },
          ],
        },
      ],
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(`import { Link as MpLink } from 'react-router-dom';
import { useRoute as useMpRoute } from 'wouter';
import { useMpRouter } from '@fixture/router-runtime';
`);
  });

  it("preserves consumer-side local aliases when renaming imported symbols", () => {
    const source = `import { MpLink as NavLink, useMpRouter as useNav } from '@mission-platform/router';
`;

    const result = rewriteImportsWithCst(source, {
      rewrites: [
        {
          targetModule: "@mission-platform/router",
          replacementModule: "react-router-dom",
          specifiers: [
            { sourceName: "MpLink", importedName: "Link" },
            { sourceName: "useMpRouter", importedName: "useNavigate" },
          ],
        },
      ],
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(
      "import { Link as NavLink, useNavigate as useNav } from 'react-router-dom';\n",
    );
  });

  it("supports multiple rewrite specifications across different modules", () => {
    const source = `import { MpLink } from '@mission-platform/router';
import { Button } from '@mission-platform/ui';
`;

    const result = rewriteImportsWithCst(source, {
      rewrites: [
        {
          targetModule: "@mission-platform/router",
          replacementModule: "@mission-platform/forge-router-redwood",
        },
        {
          targetModule: "@mission-platform/ui",
          replacementModule: "@mission-platform/components",
        },
      ],
      preserveNamedSpecifiers: true,
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toContain("@mission-platform/forge-router-redwood");
    expect(result.code).toContain("@mission-platform/components");
  });

  it("rewrites dynamic imports matching targetModule", () => {
    const source = `export async function loadRouter() {
  const router = await import('@mission-platform/router');
  return router;
}
`;

    const result = rewriteImportsWithCst(source, {
      targetModule: "@mission-platform/router",
      replacementModule: "@mission-platform/forge-router-redwood",
    });

    expect(result.transformed).toBe(true);
    expect(result.code).toBe(`export async function loadRouter() {
  const router = await import('@mission-platform/forge-router-redwood');
  return router;
}
`);
  });

  it("throws when dynamic import matches conflicting replacement modules or removal", () => {
    const source = `export async function loadRouter() {
  const router = await import('@mission-platform/router');
  return router;
}
`;

    expect(() => {
      rewriteImportsWithCst(source, {
        rewrites: [
          {
            targetModule: "@mission-platform/router",
            replacementModule: "package-a",
          },
          {
            targetModule: "@mission-platform/router",
            replacementModule: "package-b",
          },
        ],
      });
    }).toThrow("conflicting replacements");

    expect(() => {
      rewriteImportsWithCst(source, {
        rewrites: [
          {
            targetModule: "@mission-platform/router",
          },
        ],
      });
    }).toThrow("no replacement or removal");
  });

  it("throws SyntaxError when input source cannot be parsed", () => {
    const invalidSource =
      "import { from '@mission-platform/router' incomplete syntax ;;;;; {{{";

    expect(() => {
      rewriteImportsWithCst(invalidSource, {
        targetModule: "@mission-platform/router",
        replacementModule: "test",
      });
    }).toThrow(SyntaxError);
  });

  it("executes well under 5ms per module file (performance requirement)", () => {
    const source = `import {
  MpLink,
  useMpRoute,
  useMpRouter,
} from '@mission-platform/router';

export function LargeComponent() {
  const route = useMpRoute();
  const router = useMpRouter();
  return (
    <div>
      <MpLink to={route.path}>Link</MpLink>
    </div>
  );
}
`;

    const start = performance.now();
    for (let index = 0; index < 50; index++) {
      rewriteImportsWithCst(source, {
        targetModule: "@mission-platform/router",
        replacementModule: "@mission-platform/forge-router-redwood",
        preserveNamedSpecifiers: true,
      });
    }
    const elapsed = performance.now() - start;
    const avgPerCall = elapsed / 50;

    // Must be well below 5ms (typically <0.5ms)
    expect(avgPerCall).toBeLessThan(5);
  });
});

describe("parseCst", () => {
  it("infers language from file extension", () => {
    const tsResult = parseCst("const x: number = 1;", "example.ts");
    expect(tsResult.errors).toHaveLength(0);

    const tsxResult = parseCst("const el = <div />;", "example.tsx");
    expect(tsxResult.errors).toHaveLength(0);

    const jsResult = parseCst("const x = 1;", "example.js");
    expect(jsResult.errors).toHaveLength(0);
  });
});
