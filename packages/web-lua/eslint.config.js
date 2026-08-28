import base from "@mission-platform/eslint-config";

export default [
  ...base,
  {
    ignores: ["*.config.ts", "dist-node/**", "fixtures/**"],
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.build.json",
        projectService: false,
      },
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.test.json",
        projectService: false,
      },
    },
    rules: {
      // These fixtures assert Lua's UTF-16 byte/string behavior and retain historical filenames.
      "unicorn/prefer-code-point": "off",
      "unicorn/prevent-abbreviations": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  {
    files: ["src/abi.ts"],
    rules: {
      // The ABI uses null as its explicit invalid-value sentinel.
      "unicorn/no-null": "off",
    },
  },
  {
    files: ["src/compiler.ts", "src/runtime-step4.spec.ts"],
    rules: {
      // These type-only dynamic imports are part of the generated runtime boundary.
      "@typescript-eslint/consistent-type-imports": "off",
      "unicorn/import-style": "off",
    },
  },
  {
    files: ["src/differential.ts"],
    rules: {
      // PATH is inherited from the host process and intentionally not a task input.
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  {
    files: ["src/runtime.ts"],
    rules: {
      // Runtime helpers are kept next to the capability they validate.
      "unicorn/consistent-function-scoping": "off",
      // Re-exporting imported ABI constants preserves the local runtime API surface.
      "unicorn/prefer-export-from": "off",
    },
  },
];
