import { parseOxcModule } from './oxc.js';

import type { JsxFramework } from '@mission-platform/forge-plugin-api';

/** Read the leading `"use <framework>"` directive from an Oxc module. */
export function readFrameworkDirective(fileName: string, source: string): JsxFramework | undefined {
  if (!source.includes('use ')) return undefined;
  return parseOxcModule(fileName, source).facts.frameworkDirective;
}

/** Whether a neutral or framework-specific module belongs in a target build. */
export function moduleTargetsFramework(fileName: string, source: string, framework: string): boolean {
  const directive = readFrameworkDirective(fileName, source);
  return directive === undefined || directive === framework;
}
