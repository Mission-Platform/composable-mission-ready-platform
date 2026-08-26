import { defineTsdownLibrary } from "@mission-platform/tsdown-config";
import forgeWebScriptPlugin from "@mission-platform/vite-plugin-forge-web-script";

const webScript = forgeWebScriptPlugin({
  root: import.meta.dirname,
  requireExports: false,
  optimization: "release",
});

export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    overrides: { plugins: [webScript] },
  }),
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    outDir: "dist-node",
    platform: "node",
    overrides: {
      plugins: [webScript],
    },
  }),
];
