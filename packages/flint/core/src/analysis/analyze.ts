import { createFlintAnalysisContext } from './context.js';
import { createFlintAnalysisRuleRegistry } from './registry.js';

import type { FlintAnalysisOptions, FlintAnalysisReport } from './contracts.js';
import type { FlintFrontendResult } from '../contracts.js';

/** Run the registered source analysis rules against one frontend result. */
export function analyzeFlint(frontend: FlintFrontendResult, options: FlintAnalysisOptions = {}): FlintAnalysisReport {
  const context = createFlintAnalysisContext(frontend, options);
  return createFlintAnalysisRuleRegistry(options.rules ?? undefined).analyze(context);
}
