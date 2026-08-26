import baseConfig from "@mission-platform/eslint-config";

export default [
  ...baseConfig,
  {
    ignores: [
      "generated/**",
      "implementations/assemblyscript/kernels.ts",
      "implementations/rust/target/**",
    ],
  },
  {
    files: ["src/adapters/fws-vm.ts"],
    rules: {
      // Hand-lowered bytecode uses short register names intentionally.
      "unicorn/prevent-abbreviations": "off",
      "unicorn/consistent-function-scoping": "off",
    },
  },
  {
    files: ["src/report.ts", "src/web-lua-cli.ts"],
    rules: {
      // Benchmark adapters use null to represent an unavailable optional result.
      "unicorn/no-null": "off",
    },
  },
];
