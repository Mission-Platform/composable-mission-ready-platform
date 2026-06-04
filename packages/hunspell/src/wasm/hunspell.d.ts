// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare module "jsdoc" {
    export = MiniLZ4;
    var MiniLZ4: {};
}
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface TokenResultVector extends ClassHandle, Iterable<TokenResult> {
  size(): number;
  get(_0: number): TokenResult | undefined;
  push_back(_0: TokenResult): void;
  resize(_0: number, _1: TokenResult): void;
  set(_0: number, _1: TokenResult): boolean;
}

export interface HunspellChecker extends ClassHandle {
  spell(_0: EmbindString): boolean;
  suggest(_0: EmbindString): StringVector;
  addWord(_0: EmbindString): void;
  tokenize(_0: EmbindString): TokenResultVector;
}

export interface StringVector extends ClassHandle, Iterable<string> {
  size(): number;
  get(_0: number): string | undefined;
  push_back(_0: EmbindString): void;
  resize(_0: number, _1: EmbindString): void;
  set(_0: number, _1: EmbindString): boolean;
}

export type TokenResult = {
  word: EmbindString,
  offset: number,
  length: number
};

interface EmbindModule {
  TokenResultVector: {
    new(): TokenResultVector;
  };
  HunspellChecker: {
    new(_0: EmbindString, _1: EmbindString): HunspellChecker;
  };
  StringVector: {
    new(): StringVector;
  };
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
