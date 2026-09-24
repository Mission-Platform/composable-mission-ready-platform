import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { defineTsdownForgeTarget, resolveTsdownOutputDirectory } from '@mission-platform/tsdown-config';
import { compile as compileSass } from 'sass-embedded';

const rootDirectory = import.meta.dirname;
const packageRequire = createRequire(path.join(rootDirectory, 'package.json'));

/** Compiles and emits layout accessibility styles to the target distribution folder. */
function emitA11yStyles(): void {
  const source = path.resolve(rootDirectory, 'src/styles/a11y.scss');
  const outFile = resolveTsdownOutputDirectory(
    rootDirectory,
    path.resolve(rootDirectory, 'dist/styles/a11y.css'),
    process.env.FORGE_BUILD_STAGE_ROOT,
  );
  const result = compileSass(source, {
    style: 'expanded',
    importers: [
      {
        findFileUrl(url: string) {
          try {
            return pathToFileURL(packageRequire.resolve(url));
          } catch {
            // eslint-disable-next-line unicorn/no-null -- Sass Importer protocol returns null when unresolvable
            return null;
          }
        },
      },
    ],
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, result.css, 'utf8');
}

export default defineTsdownForgeTarget({
  rootDir: rootDirectory,
  entry: 'src/components/index.ts',
  clean: true,
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/components'),
    hooks: {
      'build:done': () => {
        emitA11yStyles();
      },
    },
  },
});
