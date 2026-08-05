import { defineTsdownForgeHooksAll } from '@mission-platform/vite-plugin-forge';

/**
 * Neutral root entry (`dist/`) plus the five forge framework builds
 * (`dist/{react,vue,solid,svelte,web-components}/`). Stage-1 generation and
 * Stage-2/dts plugins are wired by `defineTsdownForgeHooksAll`.
 */
export default defineTsdownForgeHooksAll({
  rootDir: import.meta.dirname,
  frameworks: ['react', 'vue', 'solid', 'svelte', 'web-components'],
  name: 'MissionPlatformObservers',
});
