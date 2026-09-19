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

/** Web IDL string type names distinguished from generic primitive types. */
export type WebIdlStringType = 'ByteString' | 'CSSOMString' | 'DOMString' | 'USVString';

/** Web IDL buffer source type names mapped to typed array or view host types. */
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

/** Structural classification of a parsed Web IDL type reference. */
export type WebIdlTypeKind =
  'buffer' | 'frozen-array' | 'named' | 'primitive' | 'promise' | 'record' | 'sequence' | 'string' | 'union';

/** Resolved Web IDL type reference, including nested type arguments for generics and unions. */
export interface WebIdlType {
  readonly kind: WebIdlTypeKind;
  readonly name: string;
  readonly nullable?: boolean;
  readonly typeArguments?: readonly WebIdlType[];
  readonly unionTypes?: readonly WebIdlType[];
}

/** Single operation, constructor, or callback argument declaration. */
export interface WebIdlArgument {
  readonly name: string;
  readonly type: WebIdlType;
  readonly optional?: boolean;
  readonly variadic?: boolean;
  readonly defaultValue?: boolean | number | string;
}

/** Web IDL interface, namespace, or callback operation (method) declaration. */
export interface WebIdlOperation {
  readonly kind: 'operation';
  readonly name?: string;
  readonly special?: 'deleter' | 'getter' | 'setter' | 'stringifier';
  readonly static?: boolean;
  readonly returnType: WebIdlType;
  readonly arguments: readonly WebIdlArgument[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

/** Web IDL interface or namespace attribute (property) declaration. */
export interface WebIdlAttribute {
  readonly kind: 'attribute';
  readonly name: string;
  readonly readonly: boolean;
  readonly static?: boolean;
  readonly type: WebIdlType;
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

/** Web IDL interface constant declaration with a literal value. */
export interface WebIdlConstant {
  readonly kind: 'const';
  readonly name: string;
  readonly type: WebIdlType;
  readonly value: boolean | number | string;
}

/** Web IDL interface constructor operation declaration. */
export interface WebIdlConstructor {
  readonly kind: 'constructor';
  readonly arguments: readonly WebIdlArgument[];
}

/** Any member declaration that may appear inside a Web IDL interface body. */
export type WebIdlMember = WebIdlAttribute | WebIdlConstant | WebIdlConstructor | WebIdlOperation;

/** Web IDL interface (or interface mixin) declaration with its members. */
export interface WebIdlInterface {
  readonly kind: 'interface';
  readonly name: string;
  readonly parent?: string;
  readonly partial?: boolean;
  readonly mixin?: boolean;
  readonly members: readonly WebIdlMember[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

/** Single field declaration within a Web IDL dictionary. */
export interface WebIdlDictionaryMember {
  readonly name: string;
  readonly type: WebIdlType;
  readonly required?: boolean;
  readonly defaultValue?: boolean | number | string;
}

/** Web IDL dictionary declaration describing an ordered plain-data record. */
export interface WebIdlDictionary {
  readonly kind: 'dictionary';
  readonly name: string;
  readonly parent?: string;
  readonly partial?: boolean;
  readonly members: readonly WebIdlDictionaryMember[];
  readonly extendedAttributes?: Readonly<Record<string, boolean | string>>;
}

/** Web IDL enumeration declaration and its allowed string values. */
export interface WebIdlEnum {
  readonly kind: 'enum';
  readonly name: string;
  readonly values: readonly string[];
}

/** Web IDL typedef declaration aliasing a name to another type reference. */
export interface WebIdlTypedef {
  readonly kind: 'typedef';
  readonly name: string;
  readonly type: WebIdlType;
}

/** Web IDL callback function type declaration. */
export interface WebIdlCallback {
  readonly kind: 'callback';
  readonly name: string;
  readonly returnType: WebIdlType;
  readonly arguments: readonly WebIdlArgument[];
}

/** Web IDL namespace declaration grouping static attributes and operations. */
export interface WebIdlNamespace {
  readonly kind: 'namespace';
  readonly name: string;
  readonly members: readonly (WebIdlAttribute | WebIdlConstant | WebIdlOperation)[];
}

/** Any top-level definition that may appear in a parsed Web IDL module. */
export type WebIdlDefinition =
  WebIdlCallback | WebIdlDictionary | WebIdlEnum | WebIdlInterface | WebIdlNamespace | WebIdlTypedef;

/** Root AST node produced by parsing a complete Web IDL source document. */
export interface WebIdlModule {
  readonly definitions: readonly WebIdlDefinition[];
}

/** Options controlling FLINT header and capability-import binding generation. */
export interface FlintBindingOptions {
  /** Target namespace for capability imports (e.g. 'web.dom', 'web.crypto'). */
  readonly capabilityPrefix?: string;
  /** Whether to emit capability import statements (`import capability ... as ...`). */
  readonly emitCapabilityImports?: boolean;
  /** Whether to emit structural interfaces (`interface ... { fn ... }`). */
  readonly emitInterfaces?: boolean;
  /** Custom type mappings (Web IDL type name -> FLINT type name). */
  readonly customTypeMappings?: Readonly<Record<string, string>>;
}

/** Options controlling zero-copy host JavaScript/TypeScript shim generation. */
export interface HostShimOptions {
  /** Export name of interop memory in Wasm instance (defaults to 'memory'). */
  readonly memoryExportName?: string;
  /** Memory index for multi-memory (defaults to 1 for Memory 1). */
  readonly memoryIndex?: number;
  /** Allocator export in Wasm instance (defaults to 'flint_alloc'). */
  readonly allocatorExportName?: string;
  /** Deallocator export in Wasm instance (defaults to 'flint_dealloc'). */
  readonly deallocatorExportName?: string;
  /** Capability namespace prefix (e.g. 'web.crypto'). */
  readonly capabilityPrefix?: string;
  /** Target language (defaults to 'typescript'). */
  readonly targetLanguage?: 'javascript' | 'typescript';
}

/** Options controlling TypeScript declaration (`.d.ts`) generation. */
export interface DtsOptions {
  /** Capability namespace prefix. */
  readonly capabilityPrefix?: string;
  /** Module export name. */
  readonly moduleName?: string;
}

/** Combined options accepted by the end-to-end Web IDL compilation entry point. */
export interface WebIdlCompileOptions {
  readonly flint?: FlintBindingOptions;
  readonly host?: HostShimOptions;
  readonly dts?: DtsOptions;
}

/** Combined output of compiling a Web IDL source: FLINT bindings, host shims, and `.d.ts` declarations. */
export interface WebIdlCompileResult {
  readonly flintBindings: string;
  readonly hostShims: string;
  readonly typeDeclarations: string;
  readonly ast: WebIdlModule;
}
