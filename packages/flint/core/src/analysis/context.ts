import { createFlintAnalysisFacts } from './facts.js';
import { createFlintAnalysisPolicy } from './policy.js';

import type { FlintFrontendResult } from '../contracts.js';
import type { FlintAnalysisContext, FlintAnalysisOptions, FlintAnalysisSourceFile } from './contracts.js';

export function createFlintAnalysisContext(
  frontend: FlintFrontendResult,
  options: FlintAnalysisOptions = {},
): FlintAnalysisContext {
  const sourceFiles: readonly FlintAnalysisSourceFile[] = options.sourceFiles ?? [
    { fileName: frontend.fileName, source: frontend.source },
    ...frontend.sourceFiles.filter((fileName) => fileName !== frontend.fileName).map((fileName) => ({ fileName })),
  ];
  const policy = createFlintAnalysisPolicy(options.policy);
  return {
    frontend,
    source: frontend.source,
    fileName: frontend.fileName,
    sourceFiles,
    ...(options.sourceMap === undefined ? {} : { sourceMap: options.sourceMap }),
    ...(frontend.ir === undefined ? {} : { ir: frontend.ir }),
    ...(frontend.optimizedIr === undefined ? {} : { optimizedIr: frontend.optimizedIr }),
    ...(frontend.abi === undefined ? {} : { abi: frontend.abi }),
    links: frontend.links,
    targetFeatures: options.targetFeatures ?? policy.targetFeatures,
    policy,
    facts: createFlintAnalysisFacts(frontend, policy.boundsChecks),
  };
}
