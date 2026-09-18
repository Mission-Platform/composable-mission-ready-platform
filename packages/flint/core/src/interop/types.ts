/**
 * Web IDL AST and configuration types for the Flint compiler interop layer.
 */

export type WebIdlPrimitiveType =
  | 'any'
  | 'bigint'
  | 'boolean'
  | 'byte'
  | 'double'
  | 'float'
  | 'long'
  | 'long long'
  | 'object'
  | 'octet'
  | 'short'
  | 'undefined'
  | 'unrestricted double'
  | 'unrestricted float'
  | 'unsigned long'
  | 'unsigned long long'
  | 'unsigned short'
  | 'void';

export type WebIdlStringType = 'ByteString' | 'CSSOMString' | 'DOMString' | 'USVString';

export type WebIdlBufferType =
  | 'ArrayBuffer'
  | 'ArrayBufferView'
  | 'BufferSource'
  | 'DataView'
  | 'Float32Array'
  | 'Float64Array'
  | 'Int16Array'
  | 'Int32Array'
  | 'Int8Array'
  | 'SharedArrayBuffer'
  | 'Uint16Array'
  | 'Uint32Array'
  | 'Uint8Array'
  | 'Uint8ClampedArray';

export type WebIdlTypeKind =
  'buffer' | 'frozen-array' | 'named' | 'primitive' | 'promise' | 'record' | 'sequence' | 'string' | 'union';

export interface WebIdlType {
  readonly kind: WebIdlTypeKind;
  readonly name: string;
  readonly nullable?: boolean;
  readonly typeArguments?: readonly WebIdlType[];
  readonly unionTypes?: readonly WebIdlType[];
}

export interface WebIdlArgument {
  readonly name: string;
  readonly type: WebIdlType;
  readonly optional?: boolean;
  readonly variadic?: boolean;
  readonly defaultValue?: boolean | number | string;
}

export interface WebIdlOperation {
  readonly kind: 'operation';
  readonly name?: string;
  readonly special?: 'deleter' | 'getter' | 'setter' | 'stringifier';
  readonly static?: boolean;
  readonly returnType: WebIdlType;
  readonly arguments: readonly WebIdlArgument[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

export interface WebIdlAttribute {
  readonly kind: 'attribute';
  readonly name: string;
  readonly readonly: boolean;
  readonly static?: boolean;
  readonly type: WebIdlType;
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

export interface WebIdlConstant {
  readonly kind: 'const';
  readonly name: string;
  readonly type: WebIdlType;
  readonly value: boolean | number | string;
}

export interface WebIdlConstructor {
  readonly kind: 'constructor';
  readonly arguments: readonly WebIdlArgument[];
}

export type WebIdlMember = WebIdlAttribute | WebIdlConstant | WebIdlConstructor | WebIdlOperation;

export interface WebIdlInterface {
  readonly kind: 'interface';
  readonly name: string;
  readonly parent?: string;
  readonly partial?: boolean;
  readonly mixin?: boolean;
  readonly members: readonly WebIdlMember[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

export interface WebIdlDictionaryMember {
  readonly name: string;
  readonly type: WebIdlType;
  readonly required?: boolean;
  readonly defaultValue?: boolean | number | string;
}

export interface WebIdlDictionary {
  readonly kind: 'dictionary';
  readonly name: string;
  readonly parent?: string;
  readonly partial?: boolean;
  readonly members: readonly WebIdlDictionaryMember[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

export interface WebIdlEnum {
  readonly kind: 'enum';
  readonly name: string;
  readonly values: readonly string[];
}

export interface WebIdlTypedef {
  readonly kind: 'typedef';
  readonly name: string;
  readonly type: WebIdlType;
}

export interface WebIdlCallback {
  readonly kind: 'callback';
  readonly name: string;
  readonly returnType: WebIdlType;
  readonly arguments: readonly WebIdlArgument[];
}

export interface WebIdlNamespace {
  readonly kind: 'namespace';
  readonly name: string;
  readonly members: readonly (WebIdlAttribute | WebIdlConstant | WebIdlOperation)[];
}

export type WebIdlDefinition =
  WebIdlCallback | WebIdlDictionary | WebIdlEnum | WebIdlInterface | WebIdlNamespace | WebIdlTypedef;

export interface WebIdlModule {
  readonly definitions: readonly WebIdlDefinition[];
}

export interface FlintBindingOptions {
  /** Target namespace for capability imports (e.g. 'web.dom', 'web.crypto'). */
  readonly capabilityPrefix?: string;
  /** Whether to emit capability import statements (`import capability ... as ...`). */
  readonly emitCapabilityImports?: boolean;
  /** Whether to emit structural interfaces (`interface ... { fn ... }`). */
  readonly emitInterfaces?: boolean;
  /** Custom type mappings (Web IDL type name -> FWS type name). */
  readonly customTypeMappings?: Readonly<Record<string, string>>;
}

export interface HostShimOptions {
  /** Export name of interop memory in Wasm instance (defaults to 'memory'). */
  readonly memoryExportName?: string;
  /** Memory index for multi-memory (defaults to 1 for Memory 1). */
  readonly memoryIndex?: number;
  /** Allocator export in Wasm instance (defaults to 'fws_alloc'). */
  readonly allocatorExportName?: string;
  /** Deallocator export in Wasm instance (defaults to 'fws_dealloc'). */
  readonly deallocatorExportName?: string;
  /** Capability namespace prefix (e.g. 'web.crypto'). */
  readonly capabilityPrefix?: string;
  /** Target language (defaults to 'typescript'). */
  readonly targetLanguage?: 'javascript' | 'typescript';
}

export interface DtsOptions {
  /** Capability namespace prefix. */
  readonly capabilityPrefix?: string;
  /** Module export name. */
  readonly moduleName?: string;
}

export interface WebIdlCompileOptions {
  readonly flint?: FlintBindingOptions;
  readonly host?: HostShimOptions;
  readonly dts?: DtsOptions;
}

export interface WebIdlCompileResult {
  readonly flintBindings: string;
  readonly hostShims: string;
  readonly typeDeclarations: string;
  readonly ast: WebIdlModule;
}
