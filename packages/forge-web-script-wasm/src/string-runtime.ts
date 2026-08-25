const STATIC_DATA_START = 1024;

export const STRING_RUNTIME_FUNCTION_COUNT = 6;

function signedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = BigInt(value);
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    result.push(more ? byte | 0x80 : byte);
  }
  return result;
}

function local(index: number): number[] {
  return [0x20, ...signedLeb(index)];
}

function constant(value: number): number[] {
  return [0x41, ...signedLeb(value)];
}

function memoryCopy(): number[] {
  return [0xfc, 0x0a, 0x00, 0x00];
}

function ifTrap(condition: readonly number[]): number[] {
  return [...condition, 0x04, 0x40, 0x00, 0x0b];
}

function checkRange(pointer: number, length: number): number[] {
  const end = [...local(length), ...local(pointer), 0x6a];
  return [
    ...ifTrap([...local(pointer), ...constant(STATIC_DATA_START), 0x49]),
    ...ifTrap([...end, ...local(pointer), 0x49]),
    ...ifTrap([...end, 0x3f, 0x00, ...constant(65_536), 0x6c, 0x4b]),
  ];
}

function body(localCount: number, instructions: readonly number[]): number[] {
  return [localCount === 0 ? 0 : 1, ...(localCount === 0 ? [] : [localCount, 0x7f]), ...instructions, 0x0b];
}

function stringLength(): number[] {
  return body(0, [...checkRange(0, 1), ...local(1)]);
}

function concat(allocatorIndex: number): number[] {
  return body(1, [
    ...checkRange(0, 1),
    ...checkRange(2, 3),
    ...local(1),
    ...local(3),
    0x6a,
    0x22,
    0x04,
    0x10,
    ...signedLeb(allocatorIndex),
    0x21,
    0x04,
    ...local(4),
    ...local(0),
    ...local(1),
    ...memoryCopy(),
    ...local(4),
    ...local(1),
    0x6a,
    ...local(2),
    ...local(3),
    ...memoryCopy(),
    ...local(4),
    ...local(1),
    ...local(3),
    0x6a,
  ]);
}

function byteAt(): number[] {
  const invalid = [...local(2), ...constant(0), 0x48, ...local(2), ...local(1), 0x4f, 0x72];
  const address = [...local(0), ...local(2), 0x6a];
  return body(0, [...checkRange(0, 1), ...ifTrap(invalid), ...address, 0x2d, 0x00, 0x00]);
}

function startsWith(simd: boolean): number[] {
  const valueAddress = [...local(0), ...local(4), 0x6a];
  const prefixAddress = [...local(2), ...local(4), 0x6a];
  const compare = [
    ...valueAddress,
    0x2d,
    0x00,
    0x00,
    ...prefixAddress,
    0x2d,
    0x00,
    0x00,
    0x47,
    0x04,
    0x40,
    ...constant(0),
    0x0f,
    0x0b,
  ];
  const scalarTail = [
    0x02,
    0x40,
    0x03,
    0x40,
    ...local(4),
    ...local(3),
    0x4f,
    0x0d,
    0x01,
    ...compare,
    ...local(4),
    ...constant(1),
    0x6a,
    0x21,
    0x04,
    0x0c,
    0x00,
    0x0b,
    0x0b,
    ...constant(1),
  ];
  const scalar = [
    ...checkRange(0, 1),
    ...checkRange(2, 3),
    ...ifTrap([...local(3), ...local(1), 0x4b]),
    ...constant(0),
    0x21,
    0x04,
    ...scalarTail,
  ];
  if (!simd) return body(1, scalar);
  return body(1, [
    ...checkRange(0, 1),
    ...checkRange(2, 3),
    ...ifTrap([...local(3), ...local(1), 0x4b]),
    ...constant(0),
    0x21,
    0x04,
    ...local(3),
    ...constant(16),
    0x4f,
    0x04,
    0x40,
    ...local(0),
    ...local(4),
    0x6a,
    0xfd,
    0x00,
    0x00,
    0x00,
    ...local(2),
    ...local(4),
    0x6a,
    0xfd,
    0x00,
    0x00,
    0x00,
    0xfd,
    0x24,
    0xfd,
    0x53,
    0x04,
    0x40,
    ...constant(0),
    0x0f,
    0x0b,
    ...local(4),
    ...constant(16),
    0x6a,
    0x21,
    0x04,
    0x0b,
    ...scalarTail,
  ]);
}

function slice(allocatorIndex: number): number[] {
  return body(3, [
    ...checkRange(0, 1),
    ...ifTrap([...local(2), ...constant(0), 0x48]),
    ...ifTrap([...local(3), ...local(2), 0x48]),
    ...ifTrap([...local(3), ...local(1), 0x4b]),
    ...local(3),
    ...local(2),
    0x6b,
    0x22,
    0x06,
    0x10,
    ...signedLeb(allocatorIndex),
    0x21,
    0x04,
    ...local(4),
    ...local(0),
    ...local(2),
    0x6a,
    ...local(6),
    ...memoryCopy(),
    ...local(4),
    ...local(6),
  ]);
}

function toI32(): number[] {
  const firstCharacter = [...local(0), 0x2d, 0x00, 0x00, 0x21, 0x07];
  const digitCheck = [...local(7), ...constant(48), 0x48, ...local(7), ...constant(57), 0x4b, 0x72];
  // Keep two reserved locals so the shared instruction layout uses stable indexes
  // after the pointer-length string parameters.
  return body(6, [
    ...checkRange(0, 1),
    ...ifTrap([...local(1), ...constant(0), 0x46]),
    ...constant(0),
    0x21,
    0x04,
    ...constant(0),
    0x21,
    0x05,
    ...constant(1),
    0x21,
    0x06,
    ...firstCharacter,
    ...local(7),
    ...constant(45),
    0x46,
    0x04,
    0x40,
    ...ifTrap([...local(1), ...constant(1), 0x4d]),
    ...constant(-1),
    0x21,
    0x06,
    ...constant(1),
    0x21,
    0x05,
    0x05,
    ...local(7),
    ...constant(43),
    0x46,
    0x04,
    0x40,
    ...ifTrap([...local(1), ...constant(1), 0x4d]),
    ...constant(1),
    0x21,
    0x05,
    0x0b,
    0x0b,
    0x02,
    0x40,
    0x03,
    0x40,
    ...local(5),
    ...local(1),
    0x4f,
    0x0d,
    0x01,
    ...local(0),
    ...local(5),
    0x6a,
    0x2d,
    0x00,
    0x00,
    0x21,
    0x07,
    ...digitCheck,
    ...local(4),
    ...constant(10),
    0x6c,
    ...local(7),
    ...constant(48),
    0x6b,
    0x6a,
    0x21,
    0x04,
    ...local(5),
    ...constant(1),
    0x6a,
    0x21,
    0x05,
    0x0c,
    0x00,
    0x0b,
    0x0b,
    ...local(4),
    ...local(6),
    0x6c,
  ]);
}

export function buildStringRuntimeBodies(
  allocatorIndex: number,
  simd = false,
): {
  readonly concat: number[];
  readonly length: number[];
  readonly byteAt: number[];
  readonly startsWith: number[];
  readonly slice: number[];
  readonly toI32: number[];
} {
  return {
    concat: concat(allocatorIndex),
    length: stringLength(),
    byteAt: byteAt(),
    startsWith: startsWith(simd),
    slice: slice(allocatorIndex),
    toI32: toI32(),
  };
}
