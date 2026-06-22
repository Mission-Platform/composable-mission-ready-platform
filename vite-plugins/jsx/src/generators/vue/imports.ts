/**
 * `<script setup>` import and `props` declaration construction for the Vue emitter.
 *
 * {@link buildImports} assembles the SFC's `import` block (the `vue` runtime
 * imports the analysis collected, the built sibling components, the re-pointed
 * stylesheet imports, and the framework-agnostic neutral runtime/type imports),
 * while {@link buildPropsMacro} renders the `<script setup>` `defineProps(…)`
 * call from the props interface and the captured destructuring defaults.
 */
import { NEUTRAL_MODULE, VUE_ADAPTER_MODULE, type StyleImport } from '../../compiler/ast.js';

/**
 * Build the `<script setup>` props declaration — `const <param> = defineProps(…)`
 * — from the props interface and the captured destructuring defaults. Returns an
 * empty string when the component declares no (non-slot) props.
 */
export function buildPropsMacro(parameterName: string, propertyNames: string[], defaults: Map<string, string>): string {
  if (propertyNames.length === 0) {
    return '';
  }
  if (defaults.size === 0) {
    return `const ${parameterName} = defineProps([${propertyNames.map((name) => `'${name}'`).join(', ')}]);`;
  }
  const entries = propertyNames.map((name) => {
    const fallback = defaults.get(name);
    return fallback === undefined ? `  ${name}: {}` : `  ${name}: { default: ${fallback} }`;
  });
  return `const ${parameterName} = defineProps({\n${entries.join(',\n')}\n});`;
}

/** Build the Vue `<script>` import block. */
export function buildImports(
  vueImports: Set<string>,
  neutralTypes: string[],
  neutralRuntimeValues: string[],
  componentImports: { names: string[]; base: string }[],
  styleImports: StyleImport[],
  helperImports: { names: string[]; base: string }[] = [],
  vueAdapterValues: string[] = [],
): string {
  // `vueImports` holds only real runtime values (`ref`, `computed`, `useSlots`,
  // lifecycle hooks, `h`); the `<script setup>` macros need no import, so the
  // `vue` import line is omitted entirely when nothing runtime is used.
  const lines = vueImports.size === 0 ? [] : [`import { ${[...vueImports].toSorted().join(', ')} } from 'vue';`];
  // Context primitives (`createContext`/`useContext`) are remapped to the Vue
  // adapter, whose `provide`/`inject`-backed implementations match the neutral
  // semantics (React imports them straight from `react`).
  if (vueAdapterValues.length > 0) {
    lines.push(`import { ${vueAdapterValues.toSorted().join(', ')} } from '${VUE_ADAPTER_MODULE}';`);
  }
  for (const componentImport of componentImports) {
    const name = componentImport.names[0];
    if (name !== undefined) {
      lines.push(`import ${name} from './${componentImport.base}.vue';`);
    }
  }
  // Plain (non-component) helper modules keep their named imports, re-pointed at
  // the flat copy the generator writes next to the SFC.
  for (const helperImport of helperImports) {
    if (helperImport.names.length > 0) {
      lines.push(`import { ${helperImport.names.join(', ')} } from './${helperImport.base}';`);
    }
  }
  // Stylesheet imports (CSS Modules / bare CSS) are re-pointed at the flat copy
  // the generator writes next to the SFC, so the component ships its own CSS.
  for (const styleImport of styleImports) {
    lines.push(
      styleImport.name === undefined
        ? `import '${styleImport.flatSpecifier}';`
        : `import ${styleImport.name} from '${styleImport.flatSpecifier}';`,
    );
  }
  // Framework-agnostic runtime utilities (e.g. `classNames`) keep their neutral
  // import — they behave identically on Vue and are not translated.
  if (neutralRuntimeValues.length > 0) {
    lines.push(`import { ${neutralRuntimeValues.toSorted().join(', ')} } from '${NEUTRAL_MODULE}';`);
  }
  if (neutralTypes.length > 0) {
    lines.push(`import type { ${neutralTypes.join(', ')} } from '${NEUTRAL_MODULE}';`);
  }
  return lines.join('\n');
}
