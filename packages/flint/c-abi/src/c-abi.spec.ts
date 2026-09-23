import { describe, expect, it } from "vitest";

import {
  mapCTypeToFlint,
  mapCTypeToWasmValueType,
  mapFlintToFfiType,
  mapFlintToTsType,
} from "./mappings.js";
import {
  FIXED_C_PRIMITIVE_LAYOUTS,
  layoutCPrimitive,
  PLATFORM_CONFIGS,
} from "./platforms.js";
import {
  C_INTEGER_TYPES,
  C_PRIMITIVE_TYPES,
  isCIntegerType,
  isCPointerType,
  isCPrimitiveType,
  isNullablePointerType,
} from "./types.js";

describe("@mission-platform/flint-c-abi", () => {
  describe("C types and predicates", () => {
    it("recognizes all registered C primitive types", () => {
      expect(isCPrimitiveType("c_char")).toBe(true);
      expect(isCPrimitiveType("c_int")).toBe(true);
      expect(isCPrimitiveType("c_size")).toBe(true);
      expect(isCPrimitiveType("c_double")).toBe(true);
      expect(isCPrimitiveType("c_void")).toBe(true);
      expect(isCPrimitiveType("u8")).toBe(true);
      expect(isCPrimitiveType("i8")).toBe(true);
      expect(isCPrimitiveType("not_a_type")).toBe(false);
      expect(C_PRIMITIVE_TYPES.size).toBe(17);
    });

    it("identifies integer types correctly", () => {
      expect(isCIntegerType("c_int")).toBe(true);
      expect(isCIntegerType("u8")).toBe(true);
      expect(isCIntegerType("c_size")).toBe(true);
      expect(isCIntegerType("c_float")).toBe(false);
      expect(isCIntegerType("c_double")).toBe(false);
      expect(isCIntegerType("c_void")).toBe(false);
      expect(C_INTEGER_TYPES.has("c_ulonglong")).toBe(true);
    });

    it("identifies C pointer types and generic variations", () => {
      expect(isCPointerType("CPtr")).toBe(true);
      expect(isCPointerType("MutCPtr")).toBe(true);
      expect(isCPointerType("COpaquePtr")).toBe(true);
      expect(isCPointerType("CPtr<c_char>")).toBe(true);
      expect(isCPointerType("MutCPtr<u8>")).toBe(true);
      expect(isCPointerType("i32")).toBe(false);

      expect(isNullablePointerType("CPtr<c_char>")).toBe(true);
      expect(isNullablePointerType("COpaquePtr")).toBe(true);
      expect(isNullablePointerType("c_int")).toBe(false);
    });
  });

  describe("Platform ABI layout configurations", () => {
    it("defines correct pointer and long configurations for 32-bit and 64-bit targets", () => {
      const wasm32 = PLATFORM_CONFIGS["wasm32-unknown-unknown"];
      expect(wasm32.pointerSize).toBe(4);
      expect(wasm32.longSize).toBe(4);
      expect(wasm32.i64StructAlignment).toBe(8);

      const wasm64 = PLATFORM_CONFIGS["wasm64-unknown-unknown"];
      expect(wasm64.pointerSize).toBe(8);
      expect(wasm64.longSize).toBe(8);
      expect(wasm64.i64StructAlignment).toBe(8);

      const windowsMsvc = PLATFORM_CONFIGS["x86_64-pc-windows-msvc"];
      expect(windowsMsvc.pointerSize).toBe(8);
      expect(windowsMsvc.longSize).toBe(4); // LLP64
      expect(windowsMsvc.longAlignment).toBe(4);

      const linuxX64 = PLATFORM_CONFIGS["x86_64-unknown-linux-gnu"];
      expect(linuxX64.pointerSize).toBe(8);
      expect(linuxX64.longSize).toBe(8); // LP64

      const linuxI686 = PLATFORM_CONFIGS["i686-unknown-linux-gnu"];
      expect(linuxI686.pointerSize).toBe(4);
      expect(linuxI686.longSize).toBe(4);
      expect(linuxI686.i64StructAlignment).toBe(4); // x86 32-bit 4-byte alignment
    });

    it("calculates fixed primitive layouts identically across platforms", () => {
      expect(FIXED_C_PRIMITIVE_LAYOUTS["c_void"]).toEqual({
        size: 0,
        alignment: 1,
      });
      expect(layoutCPrimitive("c_char")).toEqual({ size: 1, alignment: 1 });
      expect(layoutCPrimitive("u8")).toEqual({ size: 1, alignment: 1 });
      expect(layoutCPrimitive("c_short")).toEqual({ size: 2, alignment: 2 });
      expect(layoutCPrimitive("c_int")).toEqual({ size: 4, alignment: 4 });
      expect(layoutCPrimitive("c_float")).toEqual({ size: 4, alignment: 4 });
    });

    it("calculates architecture-dependent primitive layouts correctly", () => {
      // c_long
      expect(layoutCPrimitive("c_long", "wasm32-unknown-unknown")).toEqual({
        size: 4,
        alignment: 4,
      });
      expect(layoutCPrimitive("c_long", "x86_64-pc-windows-msvc")).toEqual({
        size: 4,
        alignment: 4,
      });
      expect(layoutCPrimitive("c_long", "x86_64-unknown-linux-gnu")).toEqual({
        size: 8,
        alignment: 8,
      });

      // c_size
      expect(layoutCPrimitive("c_size", "wasm32-unknown-unknown")).toEqual({
        size: 4,
        alignment: 4,
      });
      expect(layoutCPrimitive("c_size", "wasm64-unknown-unknown")).toEqual({
        size: 8,
        alignment: 8,
      });

      // i64/double alignment on i686
      expect(layoutCPrimitive("c_double", "i686-unknown-linux-gnu")).toEqual({
        size: 8,
        alignment: 4,
      });
      expect(layoutCPrimitive("c_double", "wasm32-unknown-unknown")).toEqual({
        size: 8,
        alignment: 8,
      });
    });
  });

  describe("C type mappings", () => {
    it("maps C header types to Flint types", () => {
      expect(mapCTypeToFlint("int")).toBe("c_int");
      expect(mapCTypeToFlint("char")).toBe("c_char");
      expect(mapCTypeToFlint("uint8_t")).toBe("u8");
      expect(mapCTypeToFlint("size_t")).toBe("c_size");
      expect(mapCTypeToFlint("void")).toBe("c_void");
      expect(mapCTypeToFlint("const char*")).toBe("CPtr<c_char>");
      expect(mapCTypeToFlint("int*")).toBe("MutCPtr<c_int>");
      expect(mapCTypeToFlint("void*")).toBe("COpaquePtr");
      expect(mapCTypeToFlint("sqlite3**")).toBe("MutCPtr<COpaquePtr>");
      expect(mapCTypeToFlint("struct Point*")).toBe("MutCPtr<Point>");
      expect(mapCTypeToFlint("const struct Point*")).toBe("CPtr<Point>");
    });

    it("maps C and Flint types to Wasm value types with memory32 and memory64 awareness", () => {
      expect(mapCTypeToWasmValueType("c_int", false)).toBe("i32");
      expect(mapCTypeToWasmValueType("c_double", false)).toBe("f64");
      expect(mapCTypeToWasmValueType("c_longlong", false)).toBe("i64");
      expect(mapCTypeToWasmValueType("c_void", false)).toBe("void");
      expect(mapCTypeToWasmValueType("unit", false)).toBe("void");

      // Pointers in 32-bit vs 64-bit
      expect(mapCTypeToWasmValueType("CPtr<c_char>", false)).toBe("i32");
      expect(mapCTypeToWasmValueType("CPtr<c_char>", true)).toBe("i64");
      expect(mapCTypeToWasmValueType("MutCPtr<u8>", false)).toBe("i32");
      expect(mapCTypeToWasmValueType("MutCPtr<u8>", true)).toBe("i64");
      expect(mapCTypeToWasmValueType("COpaquePtr", false)).toBe("i32");
      expect(mapCTypeToWasmValueType("COpaquePtr", true)).toBe("i64");
      expect(mapCTypeToWasmValueType("c_size", false)).toBe("i32");
      expect(mapCTypeToWasmValueType("c_size", true)).toBe("i64");
    });

    it("maps Flint types to TypeScript declaration types", () => {
      expect(mapFlintToTsType("bool")).toBe("boolean");
      expect(mapFlintToTsType("c_void")).toBe("void");
      expect(mapFlintToTsType("c_int")).toBe("number");
      expect(mapFlintToTsType("c_float")).toBe("number");
      expect(mapFlintToTsType("c_longlong")).toBe("bigint");
      expect(mapFlintToTsType("i64")).toBe("bigint");
    });

    it("maps Flint types to bun:ffi FFITypes", () => {
      expect(mapFlintToFfiType("c_void")).toBe("FFIType.void");
      expect(mapFlintToFfiType("c_float")).toBe("FFIType.f32");
      expect(mapFlintToFfiType("c_double")).toBe("FFIType.f64");
      expect(mapFlintToFfiType("c_longlong")).toBe("FFIType.i64");
      expect(mapFlintToFfiType("c_int")).toBe("FFIType.i32");
      expect(mapFlintToFfiType("CPtr<c_char>")).toBe("FFIType.ptr");
      expect(mapFlintToFfiType("MutCPtr<Point>")).toBe("FFIType.ptr");
      expect(mapFlintToFfiType("COpaquePtr")).toBe("FFIType.ptr");
    });
  });
});
