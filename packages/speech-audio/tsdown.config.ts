import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownForgeHooksAll } from '@mission-platform/vite-plugin-forge';

/**
 * Neutral root entry (`dist/`) plus the five forge framework builds
 * (`dist/{react,vue,solid,svelte,web-components}/`). Stage-1 generation and
 * Stage-2/dts plugins are wired by `defineTsdownForgeHooksAll`.
 */
export default defineTsdownForgeHooksAll({
  rootDir: import.meta.dirname,
  frameworks: [
    forgeReactFramework(),
    forgeVueFramework(),
    forgeSolidFramework(),
    forgeSvelteFramework(),
    forgeWebComponentsFramework(),
  ],
  name: 'MissionPlatformSpeechAudio',
});
