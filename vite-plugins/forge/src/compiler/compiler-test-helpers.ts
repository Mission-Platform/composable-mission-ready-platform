import { forgeReactFramework } from '../../../../forge-plugins/forge-react/src';
import { forgeSolidFramework } from '../../../../forge-plugins/forge-solid/src';
import { forgeSvelteFramework } from '../../../../forge-plugins/forge-svelte/src';
import { forgeVueFramework } from '../../../../forge-plugins/forge-vue/src';
import { forgeWebComponentsFramework } from '../../../../forge-plugins/forge-web-components/src';

import {
  compileComponentModule as compileComponentModuleWithPlugin,
  compileHookModule as compileHookModuleWithPlugin,
} from './compile.js';

import type { CompileHookOptions, CompileOptions } from './compile.js';
import type { FrameworkOutputPlugin, JsxFramework } from '@mission-platform/forge-plugin-api';

const FRAMEWORK_PLUGINS: Readonly<Record<JsxFramework, () => FrameworkOutputPlugin>> = {
  react: forgeReactFramework,
  vue: forgeVueFramework,
  svelte: forgeSvelteFramework,
  solid: forgeSolidFramework,
  'web-components': forgeWebComponentsFramework,
};

function resolveFramework(framework: JsxFramework): FrameworkOutputPlugin {
  return FRAMEWORK_PLUGINS[framework]();
}

type FrameworkFixture = JsxFramework | FrameworkOutputPlugin;
type LegacyCompileOptions = Omit<CompileOptions, 'framework'> & { framework: FrameworkFixture };
type LegacyCompileHookOptions = Omit<CompileHookOptions, 'framework'> & { framework: FrameworkFixture };

/** Compatibility fixture helper for tests written before compile APIs accepted plugins. */
export function compileComponentModule(source: string, options: LegacyCompileOptions) {
  return compileComponentModuleWithPlugin(source, {
    ...options,
    framework: typeof options.framework === 'string' ? resolveFramework(options.framework) : options.framework,
  });
}

/** Compatibility fixture helper for tests written before compile APIs accepted plugins. */
export function compileHookModule(source: string, options: LegacyCompileHookOptions) {
  return compileHookModuleWithPlugin(source, {
    ...options,
    framework: typeof options.framework === 'string' ? resolveFramework(options.framework) : options.framework,
  });
}

export {
  hasMpStaticMarker,
  MP_STATIC_ATTR,
  moduleTargetsFramework,
  optimizeForgeModule,
  optimizeGenericModule,
  readFrameworkDirective,
} from './compile.js';
export type { JsxFramework } from '@mission-platform/forge-plugin-api';
