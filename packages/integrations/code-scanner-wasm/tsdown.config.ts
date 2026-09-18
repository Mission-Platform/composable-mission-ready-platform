import { existsSync } from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import flintPlugin, { createFlintGraphCache } from '@mission-platform/vite-plugin-flint';

const rootDirectory = import.meta.dirname;
const scannerProjectRoots = [path.resolve(rootDirectory, 'src/fws')];
const scannerFlintGraphCache = createFlintGraphCache();

/**
 * Resolves imported Flint modules across relative paths and project roots.
 */
function resolveScannerFlintModule(source: string, importer: string): string | undefined {
  const relative = path.resolve(path.dirname(importer), source);
  if (existsSync(relative)) return relative;
  for (const projectRoot of scannerProjectRoots) {
    const packageRoot = path.dirname(path.dirname(projectRoot));
    const marker = `/${path.basename(packageRoot)}/src/fws/`;
    const markerIndex = source.indexOf(marker);
    if (markerIndex !== -1) {
      return path.resolve(packageRoot, 'src/fws', source.slice(markerIndex + marker.length));
    }
  }
  return undefined;
}

const scannerFlintOptions = {
  root: rootDirectory,
  projectRoots: scannerProjectRoots,
  crossProjectLinkMode: 'static' as const,
  defaultLinkMode: 'static' as const,
  linkProfile: 'static' as const,
  optimization: 'release' as const,
  requireExports: false,
  graphCache: scannerFlintGraphCache,
  graphCacheKey: 'code-scanner-static',
  resolveModule: resolveScannerFlintModule,
  requestedCapabilities: (fileName: string) => (fileName.endsWith('/qr-decoder.flint') || fileName.endsWith('/qr-decoder.fws') ? ['qr.decode.utf8'] : undefined),
};

export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    overrides: {
      plugins: [flintPlugin(scannerFlintOptions)],
    },
  }),
];
