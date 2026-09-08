# Development guide

## Forge build lifecycle

Forge packages use the same lazy session contract from Vite and tsdown. Keep
target selection explicit by constructing caller-owned framework or CMS output
plugins, then attach the adapter plugins to the native bundler configuration.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

Configuration evaluation is intentionally cheap: graph discovery, source
generation, native bundling, declarations, and publication begin from bundler
lifecycle hooks. The shared session reuses neutral analysis across selected
targets and invalidates reverse dependents when watch mode reports a change.

Every target writes to an isolated attempt directory and is promoted only after
its manifest, declarations, maps, assets, and generated modules validate. A
failed, cancelled, or incomplete build removes only its attempt and preserves
the last successful `dist/<target>` tree and sibling targets.

For hooks use `tsdownForgeHookPlugins`; for CMS projections use
`tsdownForgeCmsPlugins` from `@mission-platform/forge-cms-plugin-api`. Do not
call generation helpers while constructing configuration, and do not introduce
framework switch tables into the neutral compiler.

## Verification

Run the focused Forge and CMS suites before representative consumer builds:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

The Forge suite covers lazy lifecycle execution, deterministic cache keys,
reverse invalidation, concurrent target coordination, declaration/CSS artifact
publication, manifest safety, and rollback at the published target directory.
