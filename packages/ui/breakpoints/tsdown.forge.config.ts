import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default defineTsdownLibrary({
  rootDir: rootDirectory,
  dts: { build: false, generator: 'oxc' },
  clean: true,
  external: ['i18next'],
});
