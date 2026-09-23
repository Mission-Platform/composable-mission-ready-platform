import base from "@mission-platform/eslint-config";

export default [
  ...base,
  {
    files: ["src/**/*.spec.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.test.json",
        projectService: false,
      },
    },
  },
];
