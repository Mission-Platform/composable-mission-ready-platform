import { describe, expect, it } from "vitest";

import { readFunctionParts, splitStatements } from "./statements.js";

describe("the statement scanners split recorded source without parsing", () => {
  it("splits a block body into its top-level statements", () => {
    const body = `
  const [count, setCount] = useState(0);
  const handler = () => { setCount(count + 1); };
  useEffect(() => { report(count); }, [count]);
  return count;
`;

    expect(splitStatements(body)).toEqual([
      "const [count, setCount] = useState(0);",
      "const handler = () => { setCount(count + 1); };",
      "useEffect(() => { report(count); }, [count]);",
      "return count;",
    ]);
  });

  it("keeps a block statement and its continuations together", () => {
    const body = `
  if (ready) {
    start();
  } else {
    stop();
  }
  try {
    run();
  } catch {
    recover();
  }
  done();
`;

    expect(splitStatements(body)).toEqual([
      "if (ready) {\n    start();\n  } else {\n    stop();\n  }",
      "try {\n    run();\n  } catch {\n    recover();\n  }",
      "done();",
    ]);
  });

  it("ignores separators inside strings, template literals and comments", () => {
    const body = `
  const label = 'a; b';
  const message = \`total: \${items.length}; done\`;
  // a comment; with a semicolon
  const done = true;
`;

    expect(splitStatements(body)).toEqual([
      "const label = 'a; b';",
      "const message = `total: ${items.length}; done`;",
      "// a comment; with a semicolon\n  const done = true;",
    ]);
  });

  it("splits a function declaration into its header and body", () => {
    const parts = readFunctionParts(
      "export function useThing<T>(value: T): Ref<T> {\n  return ref(value);\n}",
    );

    expect(parts?.header).toBe("export function useThing<T>(value: T): Ref<T>");
    expect(parts?.body.trim()).toBe("return ref(value);");
  });

  it("reports no parts for an overload signature", () => {
    expect(
      readFunctionParts("export function useThing(value: string): void;"),
    ).toBeUndefined();
  });
});
