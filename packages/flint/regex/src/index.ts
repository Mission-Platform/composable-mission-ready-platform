export * from "./bytecode.js";
export * from "./compiler.js";
export * from "./reference-vm.js";

export interface FlintStandardLibraryIdentity {
  readonly version: string;
  readonly hash: string;
}

export const DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY: FlintStandardLibraryIdentity =
  {
    version: "1.0.0",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

export function flintStandardLibraryIdentity(
  identity?: FlintStandardLibraryIdentity,
): FlintStandardLibraryIdentity {
  return identity ?? DEFAULT_FORGE_WEB_SCRIPT_STANDARD_LIBRARY_IDENTITY;
}
