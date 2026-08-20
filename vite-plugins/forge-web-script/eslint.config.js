import baseConfig from "@mission-platform/eslint-config";

export default [
  { ignores: ["dist/**"] },
  ...baseConfig,
  {
    files: ["src/**/*.ts"],
    rules: {
      "unicorn/import-style": "off",
      "unicorn/no-null": "off",
    },
  },
];
