import {
  declarations,
  graphMetadata,
  manifest,
  wasm,
} from "../fws/foundation.fws?forge-web-script-artifact";

import type { ForgeWebScriptArtifact } from "@mission-platform/forge-web-script";

import { WEB_LUA_ABI_MANIFEST } from "./abi.js";
import type { WebLuaArtifact } from "./compiler.js";

const artifact: ForgeWebScriptArtifact = {
  wasm,
  esmSource: "",
  declarations,
  manifest,
  contentHash: graphMetadata.contentHash,
  graphHash: graphMetadata.graphHash,
  linkMode: graphMetadata.linkMode,
  linkedModules: graphMetadata.linkedModules,
  diagnostics: [],
};

/** Compiled by forgeWebScriptPlugin during the package build. */
export const WEB_LUA_BUILD_ARTIFACT: WebLuaArtifact = {
  artifact,
  contentHash: graphMetadata.contentHash,
  graphHash: graphMetadata.graphHash ?? "",
  abi: WEB_LUA_ABI_MANIFEST,
};
