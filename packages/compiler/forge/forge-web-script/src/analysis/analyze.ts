import { createForgeWebScriptAnalysisContext } from './context.js';
import { createForgeWebScriptAnalysisRuleRegistry } from './registry.js';

import type { ForgeWebScriptAnalysisOptions, ForgeWebScriptAnalysisReport } from './contracts.js';
import type { ForgeWebScriptFrontendResult } from '../contracts.js';

/** Run the registered source analysis rules against one frontend result. */
export function analyzeForgeWebScript(
  frontend: ForgeWebScriptFrontendResult,
  options: ForgeWebScriptAnalysisOptions = {},
): ForgeWebScriptAnalysisReport {
  const context = createForgeWebScriptAnalysisContext(frontend, options);
  return createForgeWebScriptAnalysisRuleRegistry(options.rules ?? undefined).analyze(context);
}
