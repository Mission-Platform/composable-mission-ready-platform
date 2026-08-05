import { defineTsdownVueLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownVueLibrary({
  rootDir: import.meta.dirname,
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue.ts',
    redwood: 'src/redwood.ts',
  },
  dts: true,
});
