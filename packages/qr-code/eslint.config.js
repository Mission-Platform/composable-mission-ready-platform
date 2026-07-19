import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig, { ignores: ['rust', 'scripts', 'src/generated'] }];
