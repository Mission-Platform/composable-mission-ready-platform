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
];
