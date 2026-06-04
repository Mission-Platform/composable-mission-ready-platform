import pluginVueI18n from '@intlify/eslint-plugin-vue-i18n';
import baseConfig from '@mission-platform/eslint-config';

const i18nRulesOff = Object.fromEntries(
  Object.keys(pluginVueI18n.rules).map((rule) => [`@intlify/vue-i18n/${rule}`, 'off']),
);

export default [
  ...baseConfig,
  {
    files: ['src/components/*/icon.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'mission-platform/icons/disable-i18n',
    rules: i18nRulesOff,
  },
];
