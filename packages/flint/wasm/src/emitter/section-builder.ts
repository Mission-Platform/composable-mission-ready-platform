import { unsignedLeb } from '../encoding/leb128.js';

export const SECTION_IDS = {
  custom: 0,
  type: 1,
  import: 2,
  function: 3,
  table: 4,
  memory: 5,
  global: 6,
  export: 7,
  start: 8,
  element: 9,
  code: 10,
  data: 11,
  dataCount: 12,
} as const;

/**
 * Packages payload bytes into a WebAssembly section with section ID and length prefix.
 */
export function section(id: number, contents: readonly number[]): number[] {
  return [id, ...unsignedLeb(contents.length), ...contents];
}

/**
 * Creates a typed WebAssembly section builder.
 */
export class WasmSectionBuilder {
  private readonly sections: number[][] = [];

  public addCustomSection(name: string, payload: readonly number[]): this {
    // Custom section: name vector + payload
    const encoder = new TextEncoder();
    const nameBytes = [...encoder.encode(name)];
    const nameVector = [...unsignedLeb(nameBytes.length), ...nameBytes];
    const sectionPayload = [...nameVector, ...payload];
    this.sections.push(section(SECTION_IDS.custom, sectionPayload));
    return this;
  }

  public addSection(id: number, contents: readonly number[]): this {
    if (contents.length > 0) {
      this.sections.push(section(id, contents));
    }
    return this;
  }

  public build(): number[] {
    return this.sections.flat();
  }
}
