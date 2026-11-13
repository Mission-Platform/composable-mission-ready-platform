import { describe, expect, it } from "vitest";

import { createTypeAlgebra } from ".";

describe("Flint Type Algebra", () => {
  it("interns and deduplicates primitive and nominal types", () => {
    const algebra = createTypeAlgebra();
    const i32_1 = algebra.primitive("i32");
    const i32_2 = algebra.primitive("i32");
    expect(i32_1).toBe(i32_2);

    const vecI32_1 = algebra.nominal("Vector", [i32_1]);
    const vecI32_2 = algebra.nominal("Vector", [i32_2]);
    expect(vecI32_1).toBe(vecI32_2);

    expect(algebra.display(vecI32_1)).toBe("Vector<i32>");
  });

  it("computes accurate primitive layouts", () => {
    const algebra = createTypeAlgebra();
    const i32 = algebra.primitive("i32");
    const i64 = algebra.primitive("i64");
    const f64 = algebra.primitive("f64");
    const u8 = algebra.primitive("u8");

    expect(algebra.layout(i32)).toMatchObject({ size: 4, alignment: 4 });
    expect(algebra.layout(i64)).toMatchObject({ size: 8, alignment: 8 });
    expect(algebra.layout(f64)).toMatchObject({ size: 8, alignment: 8 });
    expect(algebra.layout(u8)).toMatchObject({ size: 1, alignment: 1 });
  });

  it("computes struct layout with alignment and padding", () => {
    const algebra = createTypeAlgebra();
    const u8 = algebra.primitive("u8");
    const i32 = algebra.primitive("i32");

    algebra.defineAggregate({
      name: "Padded",
      fields: [
        { name: "a", type: u8 },
        { name: "b", type: i32 },
      ],
    });

    const structId = algebra.nominal("Padded");
    const layout = algebra.layout(structId);
    expect(layout.size).toBe(8); // 1 byte u8 + 3 bytes padding + 4 bytes i32
    expect(layout.alignment).toBe(4);
  });
});
