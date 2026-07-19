async function instantiate(module, imports = {}) {
  const adaptedImports = {
    env: Object.setPrototypeOf({
      abort(message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        (() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
        })();
      },
    }, Object.assign(Object.create(globalThis), imports.env || {})),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    NumberType: (values => (
      // assembly/index/NumberType
      values[values.FIXED_LINE = 0] = "FIXED_LINE",
      values[values.MOBILE = 1] = "MOBILE",
      values[values.FIXED_LINE_OR_MOBILE = 2] = "FIXED_LINE_OR_MOBILE",
      values[values.UNKNOWN = -1] = "UNKNOWN",
      values
    ))({}),
    PhoneNumberFormat: (values => (
      // assembly/index/PhoneNumberFormat
      values[values.E164 = 0] = "E164",
      values[values.INTERNATIONAL = 1] = "INTERNATIONAL",
      values[values.NATIONAL = 2] = "NATIONAL",
      values[values.RFC3966 = 3] = "RFC3966",
      values
    ))({}),
    getCountryCodeForRegion(region) {
      // assembly/index/getCountryCodeForRegion(~lib/string/String) => i32
      region = __lowerString(region) || __notnull();
      return exports.getCountryCodeForRegion(region);
    },
    getRegionCodeForCountryCode(code) {
      // assembly/index/getRegionCodeForCountryCode(i32) => ~lib/string/String
      return __liftString(exports.getRegionCodeForCountryCode(code) >>> 0);
    },
    getRegionCodeForNumber(input, defaultRegion) {
      // assembly/index/getRegionCodeForNumber(~lib/string/String, ~lib/string/String) => ~lib/string/String
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return __liftString(exports.getRegionCodeForNumber(input, defaultRegion) >>> 0);
      } finally {
        __release(input);
      }
    },
    getNationalSignificantNumber(input, defaultRegion) {
      // assembly/index/getNationalSignificantNumber(~lib/string/String, ~lib/string/String) => ~lib/string/String
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return __liftString(exports.getNationalSignificantNumber(input, defaultRegion) >>> 0);
      } finally {
        __release(input);
      }
    },
    isPossibleNumber(input, defaultRegion) {
      // assembly/index/isPossibleNumber(~lib/string/String, ~lib/string/String) => bool
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return exports.isPossibleNumber(input, defaultRegion) != 0;
      } finally {
        __release(input);
      }
    },
    isValidNumber(input, defaultRegion) {
      // assembly/index/isValidNumber(~lib/string/String, ~lib/string/String) => bool
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return exports.isValidNumber(input, defaultRegion) != 0;
      } finally {
        __release(input);
      }
    },
    isValidNumberForRegion(input, region) {
      // assembly/index/isValidNumberForRegion(~lib/string/String, ~lib/string/String) => bool
      input = __retain(__lowerString(input) || __notnull());
      region = __lowerString(region) || __notnull();
      try {
        return exports.isValidNumberForRegion(input, region) != 0;
      } finally {
        __release(input);
      }
    },
    getSupportedRegions() {
      // assembly/index/getSupportedRegions() => ~lib/string/String
      return __liftString(exports.getSupportedRegions() >>> 0);
    },
    getExampleNumber(region) {
      // assembly/index/getExampleNumber(~lib/string/String) => ~lib/string/String
      region = __lowerString(region) || __notnull();
      return __liftString(exports.getExampleNumber(region) >>> 0);
    },
    getNumberType(input, defaultRegion) {
      // assembly/index/getNumberType(~lib/string/String, ~lib/string/String) => i32
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return exports.getNumberType(input, defaultRegion);
      } finally {
        __release(input);
      }
    },
    format(input, defaultRegion, fmt) {
      // assembly/index/format(~lib/string/String, ~lib/string/String, i32) => ~lib/string/String
      input = __retain(__lowerString(input) || __notnull());
      defaultRegion = __lowerString(defaultRegion) || __notnull();
      try {
        return __liftString(exports.format(input, defaultRegion, fmt) >>> 0);
      } finally {
        __release(input);
      }
    },
    formatAsYouType(input, region) {
      // assembly/index/formatAsYouType(~lib/string/String, ~lib/string/String) => ~lib/string/String
      input = __retain(__lowerString(input) || __notnull());
      region = __lowerString(region) || __notnull();
      try {
        return __liftString(exports.formatAsYouType(input, region) >>> 0);
      } finally {
        __release(input);
      }
    },
    reTest(program, classes, groupCount, input, requireEnd) {
      // assembly/regex/reTest(~lib/typedarray/Int32Array, ~lib/typedarray/Int32Array, i32, ~lib/string/String, bool) => i32
      program = __retain(__lowerTypedArray(Int32Array, 10, 2, program) || __notnull());
      classes = __retain(__lowerTypedArray(Int32Array, 10, 2, classes) || __notnull());
      input = __lowerString(input) || __notnull();
      requireEnd = requireEnd ? 1 : 0;
      try {
        return exports.reTest(program, classes, groupCount, input, requireEnd);
      } finally {
        __release(program);
        __release(classes);
      }
    },
    reCaptures(program, classes, groupCount, input, start, requireEnd) {
      // assembly/regex/reCaptures(~lib/typedarray/Int32Array, ~lib/typedarray/Int32Array, i32, ~lib/string/String, i32, bool) => ~lib/typedarray/Int32Array
      program = __retain(__lowerTypedArray(Int32Array, 10, 2, program) || __notnull());
      classes = __retain(__lowerTypedArray(Int32Array, 10, 2, classes) || __notnull());
      input = __lowerString(input) || __notnull();
      requireEnd = requireEnd ? 1 : 0;
      try {
        return __liftTypedArray(Int32Array, exports.reCaptures(program, classes, groupCount, input, start, requireEnd) >>> 0);
      } finally {
        __release(program);
        __release(classes);
      }
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const
      end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
      memoryU16 = new Uint16Array(memory.buffer);
    let
      start = pointer >>> 1,
      string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __lowerString(value) {
    if (value == null) return 0;
    const
      length = value.length,
      pointer = exports.__new(length << 1, 2) >>> 0,
      memoryU16 = new Uint16Array(memory.buffer);
    for (let i = 0; i < length; ++i) memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);
    return pointer;
  }
  function __liftTypedArray(constructor, pointer) {
    if (!pointer) return null;
    return new constructor(
      memory.buffer,
      __getU32(pointer + 4),
      __dataview.getUint32(pointer + 8, true) / constructor.BYTES_PER_ELEMENT
    ).slice();
  }
  function __lowerTypedArray(constructor, id, align, values) {
    if (values == null) return 0;
    const
      length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__new(12, id) >>> 0;
    __setU32(header + 0, buffer);
    __dataview.setUint32(header + 4, buffer, true);
    __dataview.setUint32(header + 8, length << align, true);
    new constructor(memory.buffer, buffer, length).set(values);
    exports.__unpin(buffer);
    return header;
  }
  const refcounts = new Map();
  function __retain(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount) refcounts.set(pointer, refcount + 1);
      else refcounts.set(exports.__pin(pointer), 1);
    }
    return pointer;
  }
  function __release(pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer);
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer);
      else if (refcount) refcounts.set(pointer, refcount - 1);
      else throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`);
    }
  }
  function __notnull() {
    throw TypeError("value must not be null");
  }
  let __dataview = new DataView(memory.buffer);
  function __setU32(pointer, value) {
    try {
      __dataview.setUint32(pointer, value, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      __dataview.setUint32(pointer, value, true);
    }
  }
  function __getU32(pointer) {
    try {
      return __dataview.getUint32(pointer, true);
    } catch {
      __dataview = new DataView(memory.buffer);
      return __dataview.getUint32(pointer, true);
    }
  }
  return adaptedExports;
}
export const {
  memory,
  __new,
  __pin,
  __unpin,
  __collect,
  __rtti_base,
  NumberType,
  PhoneNumberFormat,
  getCountryCodeForRegion,
  getRegionCodeForCountryCode,
  getRegionCodeForNumber,
  getNationalSignificantNumber,
  isPossibleNumber,
  isValidNumber,
  isValidNumberForRegion,
  getSupportedRegions,
  getExampleNumber,
  getNumberType,
  format,
  formatAsYouType,
  reTest,
  reCaptures,
} = await (async url => instantiate(
  await (async () => {
    const isNodeOrBun = typeof process != "undefined" && process.versions != null && (process.versions.node != null || process.versions.bun != null);
    if (isNodeOrBun) { return globalThis.WebAssembly.compile(await (await import("node:fs/promises")).readFile(url)); }
    else { return await globalThis.WebAssembly.compileStreaming(globalThis.fetch(url)); }
  })(), {
  }
))(new URL("phone-number.wasm", import.meta.url));
