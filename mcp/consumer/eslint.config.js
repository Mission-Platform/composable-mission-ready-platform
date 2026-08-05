import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      "unicorn/no-null": "off",
      "unicorn/no-process-exit": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/import-style": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/no-await-expression-member": "off",
    },
  },
];
