import { createFlintAnalysisFacts } from './facts.js';
import { createFlintAnalysisPolicy } from './policy.js';

import type { FlintFrontendResult } from '../contracts.js';
import type { FlintAnalysisContext, FlintAnalysisOptions, FlintAnalysisSourceFile } from './contracts.js';

/**
 * Resolves source files for the analysis context from frontend inputs or explicit options.
 *
 * @param frontend Frontend compiler result.
 * @param explicitFiles Optional explicit list of analysis source files.
 * @returns Readonly list of analysis source files.
 */
function resolveAnalysisSourceFiles(
  frontend: FlintFrontendResult,
  explicitFiles?: readonly FlintAnalysisSourceFile[],
): readonly FlintAnalysisSourceFile[] {
  if (explicitFiles) {
    return explicitFiles;
  }
  return [
    { fileName: frontend.fileName, source: frontend.source },
    ...frontend.sourceFiles.filter((fileName) => fileName !== frontend.fileName).map((fileName) => ({ fileName })),
  ];
}

/**
 * Creates a static analysis context wrapping frontend outputs, policies, and derived facts.
 *
 * @param frontend Frontend compiler result.
 * @param options Analysis options controlling policies and source files.
 * @returns Fully populated FlintAnalysisContext.
 */
export function createFlintAnalysisContext(
  frontend: FlintFrontendResult,
  options: FlintAnalysisOptions = {},
): FlintAnalysisContext {
  const policy = createFlintAnalysisPolicy(options.policy);
  const context: { -readonly [K in keyof FlintAnalysisContext]: FlintAnalysisContext[K] } = {
    frontend,
    source: frontend.source,
    fileName: frontend.fileName,
    sourceFiles: resolveAnalysisSourceFiles(frontend, options.sourceFiles),
    links: frontend.links,
    targetFeatures: options.targetFeatures ?? policy.targetFeatures,
    policy,
    facts: createFlintAnalysisFacts(frontend, policy.boundsChecks),
  };
  if (options.sourceMap !== undefined) context.sourceMap = options.sourceMap;
  if (frontend.ir !== undefined) context.ir = frontend.ir;
  if (frontend.optimizedIr !== undefined) context.optimizedIr = frontend.optimizedIr;
  if (frontend.abi !== undefined) context.abi = frontend.abi;
  return context;
}
