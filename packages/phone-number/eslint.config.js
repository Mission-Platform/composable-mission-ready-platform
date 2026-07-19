import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig, { ignores: ['assembly', 'build', 'src/generated'] }];
