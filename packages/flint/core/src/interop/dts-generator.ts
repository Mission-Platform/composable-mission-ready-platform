/**
 * TypeScript declaration (.d.ts) generator from Web IDL ASTs.
 * Emits type definitions matching Wasm module exports and host capability contracts.
 */

import type {
  DtsOptions,
  WebIdlDictionary,
  WebIdlEnum,
  WebIdlInterface,
  WebIdlModule,
  WebIdlType,
  WebIdlTypedef,
} from './types.js';

const WEB_IDL_TO_TS_PRIMITIVE_TYPES: Readonly<Record<string, string>> = {
  boolean: 'boolean',
  byte: 'number',
  short: 'number',
  long: 'number',
  octet: 'number',
  'unsigned short': 'number',
  'unsigned long': 'number',
  float: 'number',
  'unrestricted float': 'number',
  double: 'number',
  'unrestricted double': 'number',
  'long long': 'bigint',
  'unsigned long long': 'bigint',
  bigint: 'bigint',
  void: 'void',
  undefined: 'void',
};

/**
 * Generates TypeScript `.d.ts` declarations from a parsed Web IDL module, including a
 * `WasmHostCapabilities` descriptor for the host capability import ABI.
 */
export class DtsGenerator {
  private readonly module: WebIdlModule;
  private readonly options: DtsOptions;

  /**
   * Creates a declaration generator bound to a parsed Web IDL module.
   *
   * @param module - Parsed Web IDL module to generate declarations from.
   * @param options - Generation options such as capability prefix and module name.
   */
  public constructor(module: WebIdlModule, options: DtsOptions = {}) {
    this.module = module;
    this.options = options;
  }

  /**
   * Emits `export type` declarations for every Web IDL typedef.
   *
   * @param lines - Output line accumulator.
   */
  private generateTypedefs(lines: string[]): void {
    const typedefs = this.module.definitions.filter(
      (definition): definition is WebIdlTypedef => definition.kind === 'typedef',
    );
    for (const td of typedefs) {
      lines.push(`export type ${td.name} = ${this.mapTsType(td.type)};`);
    }
    if (typedefs.length > 0) lines.push('');
  }

  /**
   * Emits `export type` string-literal-union declarations for every Web IDL enum.
   *
   * @param lines - Output line accumulator.
   */
  private generateEnums(lines: string[]): void {
    const enums = this.module.definitions.filter((definition): definition is WebIdlEnum => definition.kind === 'enum');
    for (const enumDeclaration of enums) {
      const variants = enumDeclaration.values.map((variant) => `'${variant}'`).join(' | ');
      lines.push(`export type ${enumDeclaration.name} = ${variants || 'string'};`);
    }
    if (enums.length > 0) lines.push('');
  }

  /**
   * Emits `export interface` declarations for every Web IDL dictionary.
   *
   * @param lines - Output line accumulator.
   */
  private generateDictionaries(lines: string[]): void {
    const dictionaries = this.module.definitions.filter(
      (definition): definition is WebIdlDictionary => definition.kind === 'dictionary',
    );
    for (const dict of dictionaries) {
      const heritage = dict.parent ? ` extends ${dict.parent}` : '';
      lines.push(`export interface ${dict.name}${heritage} {`);
      for (const member of dict.members) {
        const optional = member.required ? '' : '?';
        lines.push(`  readonly ${member.name}${optional}: ${this.mapTsType(member.type)};`);
      }
      lines.push('}', '');
    }
  }

  /**
   * Emits an `export interface` declaration for a single Web IDL interface's attributes and operations.
   *
   * @param iface - Interface AST node to render.
   * @param lines - Output line accumulator.
   */
  // skipcq: JS-R1005
  private generateInterfaceDeclaration(iface: WebIdlInterface, lines: string[]): void {
    const heritage = iface.parent ? ` extends ${iface.parent}` : '';
    lines.push(`export interface ${iface.name}${heritage} {`);

    for (const member of iface.members) {
      if (member.kind === 'attribute') {
        const readonly = member.readonly ? 'readonly ' : '';
        lines.push(`  ${readonly}${member.name}: ${this.mapTsType(member.type)};`);
      } else if (member.kind === 'operation' && member.name !== undefined) {
        const arguments_ = member.arguments
          .map((argument) => `${argument.name}${argument.optional ? '?' : ''}: ${this.mapTsType(argument.type)}`)
          .join(', ');
        lines.push(`  ${member.name}(${arguments_}): ${this.mapTsType(member.returnType)};`);
      }
    }

    lines.push('}', '');
  }

  /**
   * Emits `export interface` declarations for every Web IDL interface.
   *
   * @param interfaces - Interface AST nodes to render.
   * @param lines - Output line accumulator.
   */
  private generateInterfaces(interfaces: readonly WebIdlInterface[], lines: string[]): void {
    for (const iface of interfaces) {
      this.generateInterfaceDeclaration(iface, lines);
    }
  }

  /**
   * Emits the host-capability entries for a single interface's members within the
   * `WasmHostCapabilities` descriptor.
   *
   * @param iface - Interface AST node whose members become capability entries.
   * @param prefix - Host capability namespace prefix.
   * @param lines - Output line accumulator.
   */
  // skipcq: JS-R1005
  private generateHostCapabilityMembers(iface: WebIdlInterface, prefix: string, lines: string[]): void {
    lines.push(`  readonly '${prefix}.${iface.name}': {`);
    for (const member of iface.members) {
      if (member.kind === 'attribute') {
        const getterProperty = `get_${DtsGenerator.toSnakeCase(member.name)}`;
        lines.push(`    readonly '${getterProperty}': () => ${this.mapTsType(member.type)};`);
        if (!member.readonly) {
          const setterProperty = `set_${DtsGenerator.toSnakeCase(member.name)}`;
          lines.push(`    readonly '${setterProperty}': (value: ${this.mapTsType(member.type)}) => void;`);
        }
      } else if (member.kind === 'operation' && member.name !== undefined) {
        const arguments_ = member.arguments
          .map((argument) => `${argument.name}: ${DtsGenerator.mapWasmAbiType(argument.type)}`)
          .join(', ');
        lines.push(
          `    readonly '${member.name}': (${arguments_}) => ${DtsGenerator.mapWasmAbiType(member.returnType)};`,
        );
      }
    }
    lines.push('  };');
  }

  /**
   * Emits the `WasmHostCapabilities` descriptor interface covering every interface's host bindings.
   *
   * @param interfaces - Interface AST nodes to render as capability namespaces.
   * @param prefix - Host capability namespace prefix.
   * @param lines - Output line accumulator.
   */
  private generateHostCapabilities(interfaces: readonly WebIdlInterface[], prefix: string, lines: string[]): void {
    lines.push('export interface WasmHostCapabilities {');
    for (const iface of interfaces) {
      this.generateHostCapabilityMembers(iface, prefix, lines);
    }
    lines.push('}', '');
  }

  /**
   * Generates the complete `.d.ts` output for the bound Web IDL module.
   *
   * @returns The rendered TypeScript declaration source.
   */
  public generate(): string {
    const lines: string[] = ['// Generated by Flint Web IDL Type Declaration Generator', '// DO NOT EDIT DIRECTLY', ''];

    const prefix = this.options.capabilityPrefix ?? 'web';
    const interfaces = this.module.definitions.filter(
      (definition): definition is WebIdlInterface => definition.kind === 'interface',
    );

    this.generateTypedefs(lines);
    this.generateEnums(lines);
    this.generateDictionaries(lines);
    this.generateInterfaces(interfaces, lines);
    this.generateHostCapabilities(interfaces, prefix, lines);

    return `${lines.join('\n').trim()}\n`;
  }

  /**
   * Maps a Web IDL `sequence<T>`/`FrozenArray<T>` type to a readonly TypeScript array rendering.
   *
   * @param type - Sequence or frozen-array type to map.
   * @returns The rendered readonly array type text.
   */
  private mapSequenceTsType(type: WebIdlType): string {
    const inner = type.typeArguments?.[0] ? this.mapTsType(type.typeArguments[0]) : 'unknown';
    return `readonly (${inner})[]`;
  }

  /**
   * Maps a Web IDL `Promise<T>` type to its TypeScript rendering.
   *
   * @param type - Promise type to map.
   * @returns The rendered `Promise<...>` type text.
   */
  private mapPromiseTsType(type: WebIdlType): string {
    const inner = type.typeArguments?.[0] ? this.mapTsType(type.typeArguments[0]) : 'void';
    return `Promise<${inner}>`;
  }

  /**
   * Maps a Web IDL `record<K, V>` type to its TypeScript `Record<...>` rendering.
   *
   * @param type - Record type to map.
   * @returns The rendered `Record<...>` type text.
   */
  private mapRecordTsType(type: WebIdlType): string {
    const key = type.typeArguments?.[0] ? this.mapTsType(type.typeArguments[0]) : 'string';
    const value = type.typeArguments?.[1] ? this.mapTsType(type.typeArguments[1]) : 'unknown';
    return `Record<${key}, ${value}>`;
  }

  /**
   * Maps a Web IDL container type (`sequence`/`frozen-array`, `promise`, or `record`) to its TypeScript rendering.
   *
   * @param type - Container type to map.
   * @returns The rendered TypeScript type text, without nullability suffix.
   */
  private mapContainerTsType(type: WebIdlType): string {
    switch (type.kind) {
      case 'sequence':
      case 'frozen-array': {
        return this.mapSequenceTsType(type);
      }
      case 'promise': {
        return this.mapPromiseTsType(type);
      }
      case 'record': {
        return this.mapRecordTsType(type);
      }
      default: {
        return type.name;
      }
    }
  }

  /**
   * Maps a Web IDL type reference to its TypeScript declaration rendering, including nullability.
   *
   * @param type - Web IDL type reference to map.
   * @returns The rendered TypeScript type text.
   */
  // skipcq: JS-R1005
  private mapTsType(type: WebIdlType): string {
    let result: string;

    switch (type.kind) {
      case 'primitive': {
        result = DtsGenerator.mapPrimitive(type.name);
        break;
      }
      case 'string': {
        result = 'string';
        break;
      }
      case 'buffer': {
        result = type.name === 'ArrayBuffer' ? 'ArrayBuffer' : 'Uint8Array';
        break;
      }
      case 'union': {
        result = type.unionTypes
          ? type.unionTypes.map((unionMember) => this.mapTsType(unionMember)).join(' | ')
          : 'unknown';
        break;
      }
      default: {
        result = this.mapContainerTsType(type);
        break;
      }
    }

    if (type.nullable) {
      return `${result} | null | undefined`;
    }

    return result;
  }

  /**
   * Maps a Web IDL primitive type name to its TypeScript equivalent.
   *
   * @param name - Web IDL primitive type name.
   * @returns The mapped TypeScript primitive type name.
   */
  private static mapPrimitive(name: string): string {
    return WEB_IDL_TO_TS_PRIMITIVE_TYPES[name] ?? 'any';
  }

  /**
   * Maps a Web IDL type reference to its low-level Wasm ABI representation used by host capability imports.
   *
   * @param type - Web IDL type reference to map.
   * @returns `'number'`, `'bigint'`, or `'void'`, matching the Wasm capability import ABI.
   */
  // skipcq: JS-R1005
  private static mapWasmAbiType(type: WebIdlType): string {
    if (type.kind === 'buffer' || type.kind === 'string') {
      return 'number'; // Pointer offset into linear memory
    }
    if (type.kind === 'primitive') {
      if (type.name === 'void' || type.name === 'undefined') return 'void';
      if (type.name === 'bigint' || type.name === 'long long' || type.name === 'unsigned long long') return 'bigint';
      return 'number';
    }
    return 'number';
  }

  /**
   * Converts a camelCase or mixed-case identifier to `snake_case`.
   *
   * @param string_ - Identifier to convert.
   * @returns The converted `snake_case` identifier.
   */
  private static toSnakeCase(string_: string): string {
    return string_
      .replaceAll(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replaceAll(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
  }
}

/**
 * Generates TypeScript `.d.ts` declarations for a parsed Web IDL module.
 *
 * @param module - Parsed Web IDL module to generate declarations from.
 * @param options - Generation options such as capability prefix and module name.
 * @returns The rendered TypeScript declaration source.
 */
export function generateTypeDeclarations(module: WebIdlModule, options?: DtsOptions): string {
  return new DtsGenerator(module, options).generate();
}
