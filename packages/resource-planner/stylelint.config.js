import baseConfig from "@mission-platform/stylelint-config";

export default {
  ...baseConfig,
  extends: [...(baseConfig.extends ?? []), "stylelint-config-standard-scss"],
};
