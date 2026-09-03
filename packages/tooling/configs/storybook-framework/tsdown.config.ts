import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: 'node',
  // One entry per renderer for the story slot helper: `package.json` maps each
  // to the matching `mp:<framework>` export condition, so the browser preview
  // only ever loads the active framework's branch.
  entry: {
    index: 'src/index.ts',
    'slots.neutral': 'src/slots.neutral.ts',
    'slots.vue': 'src/slots.vue.ts',
    'slots.react': 'src/slots.react.ts',
    'slots.solid': 'src/slots.solid.ts',
    'slots.svelte': 'src/slots.svelte.ts',
    'slots.web-component': 'src/slots.web-component.ts',
  },
  external: [/^@storybook\//],
});
