import baseConfig, { pluginI18next } from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'my-care-notes/generated',
    ignores: ['.vite-ssg-temp/**'],
  },
  {
    name: 'my-care-notes/i18next',
    plugins: { i18next: pluginI18next },
    rules: {
      'i18next/no-literal-string': [
        'warn',
        {
          'jsx-attributes': {
            exclude: [
              'class',
              'size',
              'variant',
              'brand',
              'placement',
              'autocomplete',
              'align',
              'justify',
              'language',
              'aria-labelledby',
              'direction',
              'gap',
              'type',
            ],
          },
        },
      ],
    },
  },
];
