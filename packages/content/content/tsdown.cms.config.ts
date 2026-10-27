import { defineStoryblokCmsConfig } from '@mission-platform/forge-cms-storyblok';

export default defineStoryblokCmsConfig({
  rootDir: import.meta.dirname,
  external: ['monaco-editor'],
});
