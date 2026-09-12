import { parseOxcModule } from './oxc.js';

import type { JsxFramework } from '@mission-platform/forge-plugin-api';

/** A source location used by graph diagnostics and import/export facts. */
export interface ForgeSourceSpan {
  start: number;
  end: number;
  line: number;
  column: number;
}

/** A static import discovered in a Forge source module. */
export interface ForgeImportFact {
  specifier: string;
  valueNames: string[];
  typeNames: string[];
  sideEffectOnly: boolean;
  span: ForgeSourceSpan;
}

/** A declaration or re-export discovered in a Forge source module. */
export interface ForgeExportFact {
  exportedName: string | undefined;
  localName: string | undefined;
  specifier: string | undefined;
  typeOnly: boolean;
  star: boolean;
  span: ForgeSourceSpan;
}

/** All static module facts needed to build the canonical Forge file graph. */
export interface ForgeModuleFacts {
  imports: ForgeImportFact[];
  exports: ForgeExportFact[];
  frameworkDirective: JsxFramework | undefined;
  hasJsx: boolean;
}

/** Extract static imports, exports, type-only edges, and framework facts from a parsed module. */
export function inspectForgeModule(fileName: string, source: string): ForgeModuleFacts {
  return parseOxcModule(fileName, source).facts;
}
