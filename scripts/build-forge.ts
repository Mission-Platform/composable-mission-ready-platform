import path from 'node:path';

import { createForgeStageRoot, normalizeForgeBuildTarget, runForgeBuild } from './forge-build.ts';

const targetArgumentIndex = process.argv.indexOf('--target');
const targetArgument = targetArgumentIndex === -1 ? undefined : process.argv[targetArgumentIndex + 1];
const target = normalizeForgeBuildTarget(targetArgument ?? process.env.FORGE_BUILD_TARGET);
const packageRoot = process.cwd();
const stageRoot = process.env.FORGE_BUILD_STAGE_ROOT ?? createForgeStageRoot(packageRoot);

await runForgeBuild({
  packageRoot: path.resolve(packageRoot),
  stageRoot,
  target,
});
