import { createForgeWebScriptAnalysisFacts } from './facts.js';
import { createForgeWebScriptAnalysisPolicy } from './policy.js';

import type { ForgeWebScriptFrontendResult } from '../contracts.js';
import type {
  ForgeWebScriptAnalysisContext,
  ForgeWebScriptAnalysisOptions,
  ForgeWebScriptAnalysisSourceFile,
} from './contracts.js';

export function createForgeWebScriptAnalysisContext(
  frontend: ForgeWebScriptFrontendResult,
  options: ForgeWebScriptAnalysisOptions = {},
): ForgeWebScriptAnalysisContext {
  const sourceFiles: readonly ForgeWebScriptAnalysisSourceFile[] = options.sourceFiles ?? [
    { fileName: frontend.fileName, source: frontend.source },
    ...frontend.sourceFiles.filter((fileName) => fileName !== frontend.fileName).map((fileName) => ({ fileName })),
  ];
  const policy = createForgeWebScriptAnalysisPolicy(options.policy);
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
    facts: createForgeWebScriptAnalysisFacts(frontend, policy.boundsChecks),
  };
}
